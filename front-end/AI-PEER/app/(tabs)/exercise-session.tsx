import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useVision } from "@/src/vision";
import { useVisionFrameProcessor } from "@/src/vision/frameProcessor";
import { SkeletonOverlay } from "@/src/vision/components/SkeletonOverlay";
import { GuideOverlay } from "@/src/vision/components/GuideOverlay";
import { getExerciseRules } from "@/src/vision/exercises";
import {
  appendExerciseCompletion,
  ExerciseActivityCategory,
} from "@/src/exercise-activity-storage";

type CatKey = "warmup" | "strength" | "balance";

function prettyCat(cat?: string) {
  if (cat === "warmup") return "Warm-Up";
  if (cat === "strength") return "Strength";
  if (cat === "balance") return "Balance";
  return "Exercise";
}

function toActivityCategory(
  cat?: string,
  fallbackCategory?: string
): ExerciseActivityCategory {
  if (cat === "warmup" || cat === "strength" || cat === "balance") return cat;
  if (
    fallbackCategory === "warmup" ||
    fallbackCategory === "strength" ||
    fallbackCategory === "balance" ||
    fallbackCategory === "assessment"
  ) {
    return fallbackCategory;
  }
  return "other";
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
  const exerciseId = params.video || `${params.cat || "warmup"}-1`;
  const exerciseRule = useMemo(() => getExerciseRules(exerciseId), [exerciseId]);
  const exerciseName = params.label || exerciseRule?.name || exerciseId;
  const activityCategory = useMemo(
    () => toActivityCategory(params.cat, exerciseRule?.category),
    [params.cat, exerciseRule?.category]
  );

  // MediaPipe model loads automatically via usePoseDetection hook in frameProcessor.
  // We consider it ready immediately since the hook handles initialization internally.
  const modelReady = true;
  const isModelLoading = false;
  const [modelError, setModelError] = useState<Error | null>(null);

  // vision hook
  const {
    isTracking,
    currentPose,
    currentFeedback,
    repCount,
    targetReps: visionTargetReps,
    debugAngle,
    debugPhase,
    debugConfidences,
    debugPositions,
    error: visionError,
    setModelReady,
    startTracking,
    stopTracking,
    handlePoseResult,
  } = useVision();

  // reset sets when exercise changes
  useEffect(() => {
    setCurrentSet(1);
    setSetComplete(false);
    setShowSummary(false);
  }, [exerciseId]);

  // sync model ready state into vision context
  useEffect(() => {
    setModelReady(modelReady);
  }, [modelReady, setModelReady]);

  // camera
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const [showSummary, setShowSummary] = useState(false);

  // set & side management
  const isUnilateral = exerciseRule?.unilateral ?? false;
  const setsPerSide = exerciseRule?.totalSets ?? 3;
  const totalSets = isUnilateral ? setsPerSide * 2 : setsPerSide;
  const [currentSet, setCurrentSet] = useState(1);
  const [setComplete, setSetComplete] = useState(false);
  const currentSide = isUnilateral
    ? currentSet <= setsPerSide ? "Left" : "Right"
    : null;
  // exercise ID with -right suffix for right-side sets
  const trackingExerciseId = isUnilateral && currentSide === "Right"
    ? `${exerciseId}-right`
    : exerciseId;
  // next set's side (for display in between-set screen)
  const nextSide = isUnilateral
    ? (currentSet + 1) <= setsPerSide ? "Left" : "Right"
    : null;

  // timer state
  const timerDuration = exerciseRule?.timerSeconds ?? null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSecondsLeft(null);
  }, []);

  // session stats — use refs so we don't re-render on every frame
  const scoresRef = useRef<number[]>([]);
  const violationCountRef = useRef<Record<string, number>>({});
  const repCountRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);
  // trigger re-render for summary only
  const [summaryTick, setSummaryTick] = useState(0);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handleCameraLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

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
  const handleFrameResult = useCallback(
    (
      pose: Parameters<typeof handlePoseResult>[0],
      _repCount: number | null
    ) => {
      handlePoseResult(pose);
    },
    [handlePoseResult]
  );
  const frameProcessor = useVisionFrameProcessor(modelReady, handleFrameResult);

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
    repCountRef.current = 0;
    sessionStartedAtRef.current = Date.now();
    setShowSummary(false);

    setStartedAtRef.current = Date.now();
    startTracking(trackingExerciseId);

    // start countdown timer if exercise has a duration
    if (timerDuration) {
      setSecondsLeft(timerDuration);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === null || prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSetComplete = useCallback(() => {
    const nowMs = Date.now();
    const startedAt = sessionStartedAtRef.current ?? nowMs;
    const durationSec = Math.max(1, Math.round((nowMs - startedAt) / 1000));
    const framesAnalyzedCount = scoresRef.current.length;
    const finalRepCount = repCountRef.current;
    const avgScoreValue =
      framesAnalyzedCount > 0
        ? scoresRef.current.reduce((a, b) => a + b, 0) / framesAnalyzedCount
        : null;

    // Persist sessions with detected reps
    if (finalRepCount > 0) {
      void appendExerciseCompletion({
        exerciseId,
        exerciseName,
        category: activityCategory,
        repCount: finalRepCount,
        durationSec,
        avgScore: avgScoreValue,
        framesAnalyzed: framesAnalyzedCount,
      }).catch((error) => {
        console.error("[ExerciseSession] Failed to save activity record:", error);
      });
    }

    sessionStartedAtRef.current = null;
    repCountRef.current = 0;
    clearTimer();
    stopTracking();
    setSummaryTick((t) => t + 1);

    if (currentSet >= totalSets) {
      // all sets done — go back to exercise tab
      router.replace("/(tabs)/exercise");
      return;
    } else {
      // more sets to go — show between-set screen
      setSetComplete(true);
    }
  }, [currentSet, totalSets, clearTimer, stopTracking, exerciseId, exerciseName, activityCategory]);

  const handleNextSet = useCallback(async () => {
    const nextSet = currentSet + 1;
    setCurrentSet(nextSet);
    setSetComplete(false);

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    if (!modelReady) return;

    // reset stats for new set
    scoresRef.current = [];
    violationCountRef.current = {};
    repCountRef.current = 0;
    sessionStartedAtRef.current = Date.now();

    // compute tracking exercise ID from the NEW set number
    const nextTrackingId = isUnilateral && nextSet > setsPerSide
      ? `${exerciseId}-right`
      : exerciseId;
    setStartedAtRef.current = Date.now();
    startTracking(nextTrackingId);

    if (timerDuration) {
      setSecondsLeft(timerDuration);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === null || prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
  }, [currentSet, isUnilateral, setsPerSide, hasPermission, requestPermission, modelReady, startTracking, exerciseId, timerDuration]);

  // rep counted flash
  const [repFlash, setRepFlash] = useState(false);
  const prevRepCountRef = useRef<number | null>(null);

  // sync VisionContext repCount into ref for persistence
  useEffect(() => {
    if (typeof repCount === "number") {
      repCountRef.current = Math.max(repCountRef.current, repCount);

      // flash when a new rep is counted
      if (prevRepCountRef.current !== null && repCount > prevRepCountRef.current) {
        setRepFlash(true);
        setTimeout(() => setRepFlash(false), 800);
      }
      prevRepCountRef.current = repCount;
    }
  }, [repCount]);

  // auto-stop when countdown reaches 0
  useEffect(() => {
    if (secondsLeft === 0 && isTracking) {
      handleSetComplete();
    }
  }, [secondsLeft, isTracking, handleSetComplete]);

  // auto-stop when target reps reached
  // guard against stale repCount firing immediately after starting a new set
  const setStartedAtRef = useRef<number>(0);
  useEffect(() => {
    if (visionTargetReps && repCount !== null && repCount >= visionTargetReps && isTracking) {
      // only auto-stop if we've been tracking for at least 2 seconds
      if (Date.now() - setStartedAtRef.current > 2000) {
        handleSetComplete();
      }
    }
  }, [repCount, visionTargetReps, isTracking, handleSetComplete]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      sessionStartedAtRef.current = null;
      repCountRef.current = 0;
      clearTimer();
      stopTracking();
    };
  }, [stopTracking, clearTimer]);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              sessionStartedAtRef.current = null;
              repCountRef.current = 0;
              clearTimer();
              stopTracking();
              router.replace("/(tabs)/exercise");
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
          {exerciseName}
        </Text>

        {/* camera / preview area */}
        <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
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

          {/* skeleton overlays */}
          {isTracking && currentPose && containerSize.width > 0 && (
            <>
              <GuideOverlay
                pose={currentPose}
                exerciseId={exerciseId}
                width={containerSize.width}
                height={containerSize.height}
                isFrontCamera
              />
              <SkeletonOverlay
                pose={currentPose}
                feedback={currentFeedback}
                width={containerSize.width}
                height={containerSize.height}
                isFrontCamera
              />
            </>
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

          {/* debug angle overlay */}
          {isTracking && debugAngle !== null && (() => {
            const activeRule = getExerciseRules(trackingExerciseId);
            return (
              <View style={styles.debugOverlay}>
                <Text style={styles.debugText}>Angle: {debugAngle}°</Text>
                <Text style={styles.debugText}>Phase: {debugPhase}</Text>
                <Text style={styles.debugTextSmall}>
                  ID: {trackingExerciseId}
                </Text>
                <Text style={styles.debugTextSmall}>
                  KP: {activeRule?.repConfig?.keypoints?.join(' → ')}
                </Text>
                <Text style={styles.debugTextSmall}>
                  Start: {activeRule?.repConfig?.startMin}–{activeRule?.repConfig?.startMax}°
                </Text>
                <Text style={styles.debugTextSmall}>
                  End: {activeRule?.repConfig?.endMin}–{activeRule?.repConfig?.endMax}°
                </Text>
                {debugConfidences && (
                  <Text style={styles.debugTextSmall}>
                    {debugConfidences}
                  </Text>
                )}
                {debugPositions && (
                  <Text style={styles.debugTextSmall}>
                    {debugPositions}
                  </Text>
                )}
              </View>
            );
          })()}

          {/* timer overlay */}
          {isTracking && secondsLeft !== null && (
            <View style={styles.timerOverlay}>
              <Text style={[styles.timerText, secondsLeft <= 5 && styles.timerTextUrgent]}>
                {secondsLeft}s
              </Text>
              <Text style={styles.timerLabel}>remaining</Text>
            </View>
          )}

          {/* rep counter moved below camera */}

          {/* set indicator overlay */}
          {isTracking && totalSets > 1 && (
            <View style={styles.setOverlay}>
              <Text style={styles.setText}>Set {currentSet}/{totalSets}</Text>
              {currentSide && (
                <Text style={styles.sideText}>{currentSide} Side</Text>
              )}
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

        {/* rep counter below camera */}
        {isTracking && visionTargetReps !== null && repCount !== null && (
          <View style={[styles.repCounterBar, repFlash && styles.repCounterFlash]}>
            <Text style={[styles.repCounterText, repCount >= visionTargetReps && { color: warmRed }]}>
              {repCount} / {visionTargetReps} reps
            </Text>
            {repFlash && (
              <Text style={styles.repCountedLabel}>Rep counted!</Text>
            )}
          </View>
        )}

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

        {/* between-set screen */}
        {setComplete && !isTracking && !showSummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Set {currentSet}/{totalSets} Complete!
            </Text>
            {isUnilateral && currentSet === setsPerSide && (
              <View style={styles.switchSidesBox}>
                <Ionicons name="swap-horizontal" size={24} color="#2E5AAC" />
                <Text style={styles.switchSidesText}>
                  Switch to your Right Side
                </Text>
              </View>
            )}
            {nextSide && (
              <Text style={styles.sideLabel}>
                Next: {nextSide} Side
              </Text>
            )}
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
        {!isTracking && !showSummary && !setComplete && (
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

        {/* controls */}
        <View style={styles.controlsRow}>
          {isTracking ? (
            <TouchableOpacity
              style={styles.stopBtn}
              activeOpacity={0.9}
              onPress={handleSetComplete}
            >
              <Ionicons name="square" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Stop Monitoring</Text>
            </TouchableOpacity>
          ) : setComplete ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={handleNextSet}
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.primaryText}>
                Next Set ({currentSet + 1}/{totalSets})
              </Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeStrip = "#F3E7D9";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { flex: 1, paddingHorizontal: 16 },
  containerContent: { paddingBottom: 24 },

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
    height: 500,
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

  debugOverlay: {
    position: "absolute",
    top: 60,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  debugText: { fontSize: 32, fontWeight: "900", color: "#0F0" },
  debugTextSmall: { fontSize: 22, fontWeight: "700", color: "#AAA", marginTop: 6 },

  timerOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
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
  timerText: { fontSize: 28, fontWeight: "900", color: "#222" },
  timerTextUrgent: { color: warmRed },
  timerLabel: { fontSize: 10, fontWeight: "800", color: "#6B5E55", marginTop: 2 },

  setOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  setText: { fontSize: 14, fontWeight: "900", color: "#222" },
  sideText: { fontSize: 11, fontWeight: "800", color: "#2E5AAC", marginTop: 2 },

  switchSidesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  switchSidesText: { fontSize: 16, fontWeight: "900", color: "#2E5AAC" },
  sideLabel: { fontSize: 13, fontWeight: "700", color: "#6B5E55", marginTop: 8 },

  repCounterBar: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  repCounterText: { fontSize: 50, fontWeight: "900", color: "#222" },
  repCounterFlash: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1E7A3A",
    borderWidth: 2,
  },
  repCountedLabel: { fontSize: 14, fontWeight: "900", color: "#1E7A3A", marginTop: 2 },

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
