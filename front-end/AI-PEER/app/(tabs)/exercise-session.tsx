import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useVision } from "@/src/vision";
import { MODEL_ASSET } from "@/src/vision/config";
import { useVisionFrameProcessor } from "@/src/vision/frameProcessor";

type CatKey = "warmup" | "strength" | "balance";

function prettyCat(cat?: string) {
  if (cat === "warmup") return "Warm-Up";
  if (cat === "strength") return "Strength";
  if (cat === "balance") return "Balance";
  return "Exercise";
}

// map video id prefix to exercise registry category name
// wu-1 -> warmup-1, st-1 -> strength-1, ba-1 -> balance-1
const PREFIX_MAP: Record<string, string> = {
  wu: "warmup",
  st: "strength",
  ba: "balance",
};

function videoIdToExerciseId(cat: string, videoId?: string): string {
  if (!videoId) return `${cat}-1`;
  const parts = videoId.split("-");
  if (parts.length < 2) return `${cat}-1`;
  const prefix = parts[0];
  const num = parts[1];
  const category = PREFIX_MAP[prefix] || cat;
  return `${category}-${num}`;
}

export default function ExerciseSessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    cat?: CatKey;
    video?: string;
    label?: string;
    duration?: string;
  }>();

  const title = useMemo(() => prettyCat(params.cat), [params.cat]);
  const exerciseId = useMemo(
    () => videoIdToExerciseId(params.cat || "warmup", params.video),
    [params.cat, params.video]
  );

  // "default" delegate = CPU. CoreML delegate fails to load this model
  // on-device, so we fall back to CPU for reliable inference.
  const plugin = useTensorflowModel(MODEL_ASSET, "default");
  const model = plugin.state === "loaded" ? plugin.model : undefined;
  const modelReady = plugin.state === "loaded";
  const isModelLoading = plugin.state === "loading";
  const modelError = plugin.state === "error" ? plugin.error : null;

  // vision hook
  const {
    isTracking,
    currentFeedback,
    error: visionError,
    setModelReady,
    startTracking,
    stopTracking,
    handlePoseResult,
  } = useVision();

  // debug: log model plugin state changes
  useEffect(() => {
    console.log('[ExerciseSession] model plugin state:', plugin.state);
    if (plugin.state === 'error') {
      console.error('[ExerciseSession] model load error:', plugin.error);
    }
  }, [plugin.state]);

  // sync model ready state into vision context
  useEffect(() => {
    setModelReady(modelReady);
  }, [modelReady, setModelReady]);

  // camera
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const [showSummary, setShowSummary] = useState(false);

  // session stats — use refs so we don't re-render on every frame
  const scoresRef = useRef<number[]>([]);
  const violationCountRef = useRef<Record<string, number>>({});
  // trigger re-render for summary only
  const [summaryTick, setSummaryTick] = useState(0);

  // accumulate scores and violations while tracking
  useEffect(() => {
    if (!isTracking || !currentFeedback) return;

    scoresRef.current.push(currentFeedback.score);

    for (const v of currentFeedback.violations) {
      const key = v.message;
      violationCountRef.current[key] = (violationCountRef.current[key] || 0) + 1;
    }
  }, [isTracking, currentFeedback]);

  // frame processor — runs inference on worklet, posts pose back to js
  // handlePoseResult runs form analysis and updates vision context state
  const frameProcessor = useVisionFrameProcessor(model, handlePoseResult);

  const handleStartMonitoring = async () => {
    // request camera permission on first tap
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    // model loads automatically via useTensorflowModel hook
    if (!modelReady) return;

    // reset session stats
    scoresRef.current = [];
    violationCountRef.current = {};
    setShowSummary(false);

    startTracking(exerciseId);
  };

  const handleStopMonitoring = () => {
    stopTracking();
    setSummaryTick((t) => t + 1);
    setShowSummary(true);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // compute summary data — recalcs when summaryTick changes
  const avgScore = useMemo(() => {
    if (scoresRef.current.length === 0) return null;
    const sum = scoresRef.current.reduce((a, b) => a + b, 0);
    return Math.round(sum / scoresRef.current.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryTick]);

  const topViolations = useMemo(() => {
    const entries = Object.entries(violationCountRef.current);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryTick]);

  const framesAnalyzed = useMemo(() => scoresRef.current.length, [summaryTick]);

  // score color helper
  const scoreColor = (s: number) => {
    if (s >= 80) return "#1E7A3A";
    if (s >= 60) return "#B8860B";
    return warmRed;
  };

  const currentScore = currentFeedback?.score ?? null;
  const cameraActive = isTracking && hasPermission && !!device;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              stopTracking();
              router.back();
            }}
            style={styles.backBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={18} color="#3D2F27" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />
          <Ionicons name="shield-checkmark-outline" size={18} color="#2E5AAC" />
        </View>

        <Text style={styles.pageTitle}>{title} Session</Text>
        <Text style={styles.pageSub}>
          {params.label || exerciseId}
        </Text>

        {/* camera / preview area */}
        <View style={styles.cameraContainer}>
          {cameraActive && device ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isTracking}
              frameProcessor={frameProcessor}
              pixelFormat="rgb"
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              {isModelLoading ? (
                <>
                  <ActivityIndicator size="large" color={warmRed} />
                  <Text style={styles.cameraHint}>Loading model...</Text>
                </>
              ) : modelError ? (
                <>
                  <Ionicons name="alert-circle-outline" size={34} color={warmRed} />
                  <Text style={[styles.cameraHint, { color: warmRed }]}>Model failed to load</Text>
                  <Text style={styles.cameraSmall}>
                    {modelError.message}
                  </Text>
                </>
              ) : !hasPermission ? (
                <>
                  <Ionicons name="camera-outline" size={34} color="#8C7A6C" />
                  <Text style={styles.cameraHint}>Camera access needed</Text>
                  <Text style={styles.cameraSmall}>Tap Start Monitoring to enable camera</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={34} color="#8C7A6C" />
                  <Text style={styles.cameraHint}>Ready to monitor</Text>
                  <Text style={styles.cameraSmall}>
                    Place your phone so your full body is visible
                  </Text>
                </>
              )}
            </View>
          )}

          {/* score overlay when tracking */}
          {isTracking && currentScore !== null && (
            <View style={styles.scoreOverlay}>
              <Text style={[styles.scoreText, { color: scoreColor(currentScore) }]}>
                {currentScore}
              </Text>
              <Text style={styles.scoreLabel}>Form Score</Text>
            </View>
          )}

          {/* violation messages overlay */}
          {isTracking && currentFeedback && currentFeedback.violations.length > 0 && (
            <View style={styles.violationsOverlay}>
              {currentFeedback.violations.slice(0, 3).map((v, i) => (
                <View
                  key={`${v.bodyPart}-${i}`}
                  style={[
                    styles.violationBadge,
                    v.severity === "error" ? styles.violationError : styles.violationWarning,
                  ]}
                >
                  <Text style={styles.violationText}>{v.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* error display */}
        {modelError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Model failed to load: {modelError.message}</Text>
          </View>
        )}
        {visionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visionError}</Text>
          </View>
        )}

        {/* session summary */}
        {showSummary && !isTracking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Summary</Text>
            {avgScore !== null ? (
              <>
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>Average Score:</Text>
                  <Text style={[styles.feedbackValue, { color: scoreColor(avgScore) }]}>
                    {avgScore} / 100
                  </Text>
                </View>
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackLabel}>Frames Analyzed:</Text>
                  <Text style={styles.feedbackValue}>{framesAnalyzed}</Text>
                </View>
                {topViolations.length > 0 && (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipTitle}>Top Issues</Text>
                    {topViolations.map(([msg, count]) => (
                      <Text key={msg} style={styles.tipText}>
                        {"\u2022"} {msg} ({count}x)
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.feedbackValue}>No data recorded</Text>
            )}
          </View>
        )}

        {/* tips card when idle */}
        {!isTracking && !showSummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tips</Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                {"\u2022"} Place your phone so your full body is visible{"\n"}
                {"\u2022"} Use good lighting{"\n"}
                {"\u2022"} Stand ~6-8 feet away{"\n"}
                {"\u2022"} Front-facing camera works best
              </Text>
            </View>
          </View>
        )}

        {/* spacer to push controls down */}
        <View style={{ flex: 1 }} />

        {/* controls */}
        <View style={styles.controlsRow}>
          {isTracking ? (
            <TouchableOpacity
              style={styles.stopBtn}
              activeOpacity={0.9}
              onPress={handleStopMonitoring}
            >
              <Ionicons name="square" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Stop Monitoring</Text>
            </TouchableOpacity>
          ) : (
            <>
              {showSummary && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.9}
                  onPress={() => setShowSummary(false)}
                >
                  <Ionicons name="close" size={16} color="#5B4636" />
                  <Text style={styles.secondaryText}>Dismiss</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, isModelLoading && { opacity: 0.6 }]}
                activeOpacity={0.9}
                onPress={handleStartMonitoring}
                disabled={isModelLoading}
              >
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.primaryText}>
                  {isModelLoading ? "Loading..." : "Start Monitoring"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeStrip = "#F3E7D9";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backText: { fontWeight: "900", color: "#3D2F27" },

  pageTitle: { fontSize: 18, fontWeight: "900", color: "#222", marginTop: 4 },
  pageSub: { color: "#6B5E55", fontWeight: "600", marginBottom: 10 },

  cameraContainer: {
    height: 340,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: "#FFF7F1",
    borderWidth: 1,
    borderColor: "#F0E0D4",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
  },
  cameraHint: { color: "#6B5E55", fontWeight: "800" },
  cameraSmall: { color: "#8C7A6C", fontWeight: "700", textAlign: "center", paddingHorizontal: 20 },

  scoreOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  scoreText: { fontSize: 28, fontWeight: "900" },
  scoreLabel: { fontSize: 10, fontWeight: "800", color: "#6B5E55", marginTop: 2 },

  violationsOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    gap: 4,
  },
  violationBadge: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  violationError: { backgroundColor: "rgba(216,69,53,0.88)" },
  violationWarning: { backgroundColor: "rgba(184,134,11,0.82)" },
  violationText: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  errorBox: {
    backgroundColor: "#FDECEA",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: { color: warmRed, fontWeight: "700" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "900", color: "#222", marginBottom: 4 },

  feedbackRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  feedbackLabel: { width: 140, fontWeight: "900", color: "#3D2F27" },
  feedbackValue: { fontWeight: "900", color: "#1E7A3A" },

  tipBox: {
    marginTop: 10,
    backgroundColor: beigeStrip,
    borderRadius: 12,
    padding: 12,
  },
  tipTitle: { fontWeight: "900", color: "#3D2F27", marginBottom: 6 },
  tipText: { color: "#5B4636", fontWeight: "700", lineHeight: 20 },

  controlsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#E6D4C6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { fontWeight: "900", color: "#5B4636" },

  primaryBtn: {
    flex: 1.4,
    backgroundColor: warmRed,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  stopBtn: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { fontWeight: "900", color: "#FFF" },
});
