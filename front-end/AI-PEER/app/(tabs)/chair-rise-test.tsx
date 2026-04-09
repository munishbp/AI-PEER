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
import { useRouter } from "expo-router";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useVision } from "@/src/vision";
import { useVisionFrameProcessor } from "@/src/vision/frameProcessor";
import { SkeletonOverlay } from "@/src/vision/components/SkeletonOverlay";
import { GuideOverlay } from "@/src/vision/components/GuideOverlay";
import { GestureCountdownOverlay } from "@/components/GestureCountdownOverlay";
import { getExerciseRules } from "@/src/vision/exercises";
import {
  submitCompletedActivity,
  AngleSummarySet,
  FeedbackEvent,
} from "@/src/exercise-activity-storage";

const TEST_DURATION_SEC = 30;
const EXERCISE_ID = "assessment-1";
const EXERCISE_NAME = "Chair Rise";

/**
 * Generic all-elderly fall-risk band for 30-second sit-to-stand reps.
 * The CDC publishes age- and gender-stratified norms; this is a simplified
 * starting threshold per the plan and should be refined later.
 */
function fallRiskBand(reps: number): { label: string; color: string } {
  if (reps >= 12) return { label: "Above Average", color: "#1E7A3A" };
  if (reps >= 8) return { label: "Normal", color: "#B8860B" };
  return { label: "Below Average — Increased Fall Risk", color: warmRed };
}

export default function ChairRiseTestPage() {
  const router = useRouter();

  const exerciseRule = useMemo(() => getExerciseRules(EXERCISE_ID), []);

  // model is loaded inside the frame processor hook; treat as ready immediately
  const modelReady = true;

  const {
    isTracking,
    trackingMode,
    countdownSecondsLeft,
    currentPose,
    currentFeedback,
    repCount,
    debugAngle,
    debugPhase,
    debugConfidences,
    debugPositions,
    error: visionError,
    setModelReady,
    startTracking,
    startGestureWatch,
    stopTracking,
    handlePoseResult,
    getRepHistory,
  } = useVision();

  useEffect(() => {
    setModelReady(modelReady);
  }, [modelReady, setModelReady]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const handleCameraLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // 30-second countdown timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // session stats — refs to avoid re-renders on every frame.
  // chair rise is single-shot, so session start IS activity start; firstAt /
  // lastAt on FeedbackEvent entries are session-relative ms.
  const scoresRef = useRef<number[]>([]);
  const violationCountRef = useRef<Record<string, FeedbackEvent>>({});
  const repCountRef = useRef(0);
  const sessionStartedAtRef = useRef<number | null>(null);

  // final-state for the summary card
  const [showSummary, setShowSummary] = useState(false);
  const [finalReps, setFinalReps] = useState(0);
  const [finalDurationSec, setFinalDurationSec] = useState(TEST_DURATION_SEC);

  // accumulate scores and violations while tracking. each frame increments
  // the violation's count and bumps lastAt; first frame sets firstAt.
  useEffect(() => {
    if (!isTracking || !currentFeedback) return;
    scoresRef.current.push(currentFeedback.score);

    const offsetMs = sessionStartedAtRef.current
      ? Date.now() - sessionStartedAtRef.current
      : 0;

    for (const v of currentFeedback.violations) {
      const key = v.message;
      const existing = violationCountRef.current[key];
      if (existing) {
        existing.count += 1;
        existing.lastAt = offsetMs;
      } else {
        violationCountRef.current[key] = {
          message: v.message,
          severity: v.severity,
          count: 1,
          firstAt: offsetMs,
          lastAt: offsetMs,
        };
      }
    }
  }, [isTracking, currentFeedback]);

  // frame processor wiring — receives pose AND hands per frame
  const handleFrameResult = useCallback(
    (
      pose: Parameters<typeof handlePoseResult>[0],
      hands: Parameters<typeof handlePoseResult>[1]
    ) => {
      handlePoseResult(pose, hands);
    },
    [handlePoseResult]
  );
  const frameProcessor = useVisionFrameProcessor(modelReady, handleFrameResult);

  // sync repCount into the persistence ref + spoken/haptic feedback
  const prevRepCountRef = useRef<number | null>(null);
  const [repFlash, setRepFlash] = useState(false);
  useEffect(() => {
    if (typeof repCount !== "number") return;
    repCountRef.current = Math.max(repCountRef.current, repCount);
    if (prevRepCountRef.current !== null && repCount > prevRepCountRef.current) {
      setRepFlash(true);
      setTimeout(() => setRepFlash(false), 800);
      Speech.stop();
      Speech.speak(String(repCount));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    prevRepCountRef.current = repCount;
  }, [repCount]);

  const handleStop = useCallback(() => {
    const nowMs = Date.now();
    const startedAt = sessionStartedAtRef.current ?? nowMs;
    const elapsedSec = Math.max(
      1,
      Math.min(TEST_DURATION_SEC, Math.round((nowMs - startedAt) / 1000))
    );
    const finalRepCount = repCountRef.current;
    const framesAnalyzedCount = scoresRef.current.length;
    const avgScoreValue =
      framesAnalyzedCount > 0
        ? scoresRef.current.reduce((a, b) => a + b, 0) / framesAnalyzedCount
        : null;

    // grab the rep counter's per-rep angle history before stopTracking() resets it.
    // chair rise is single-shot, single-side (left_hip / left_knee / left_ankle),
    // so we record one AngleSummarySet at index 0 with side='left'.
    const repHistory = getRepHistory();
    const angleSummaries: AngleSummarySet[] = [
      { setIndex: 0, side: "left", reps: repHistory },
    ];
    const feedbackEvents = Object.values(violationCountRef.current).map((e) => ({
      ...e,
    }));

    void submitCompletedActivity({
      exerciseId: EXERCISE_ID,
      exerciseName: EXERCISE_NAME,
      category: "assessment",
      setsCompleted: 1,
      setsTarget: 1,
      durationSec: elapsedSec,
      totalReps: finalRepCount,
      repsPerSet: [finalRepCount],
      unilateral: false,
      angleSummaries,
      feedbackEvents,
      avgScore: avgScoreValue,
      framesAnalyzed: framesAnalyzedCount,
    }).catch((error) => {
      console.error("[ChairRiseTest] Failed to save activity record:", error);
    });

    setFinalReps(finalRepCount);
    setFinalDurationSec(elapsedSec);
    setShowSummary(true);

    sessionStartedAtRef.current = null;
    clearTimer();
    setSecondsLeft(null);
    stopTracking();

    // announce the result
    const band = fallRiskBand(finalRepCount);
    Speech.stop();
    Speech.speak(`Test complete. ${finalRepCount} reps. ${band.label}.`);
  }, [clearTimer, stopTracking, getRepHistory]);

  const handleStart = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    if (!modelReady) return;

    // reset session state. the per-set timer + spoken kickoff are deferred to
    // the trackingMode watcher effect below — they fire when the gesture flow
    // completes and trackingMode flips to 'tracking'.
    scoresRef.current = [];
    violationCountRef.current = {};
    repCountRef.current = 0;
    prevRepCountRef.current = null;
    setShowSummary(false);
    setFinalReps(0);

    startGestureWatch(EXERCISE_ID);
  }, [hasPermission, requestPermission, modelReady, startGestureWatch]);

  // gesture handoff: when trackingMode flips to 'tracking' (post-countdown),
  // seed the session timestamp, start the 30-second timer, and speak the
  // kickoff prompt. this used to happen inline at the bottom of handleStart.
  useEffect(() => {
    if (trackingMode !== "tracking") return;

    sessionStartedAtRef.current = Date.now();
    setSecondsLeft(TEST_DURATION_SEC);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    Speech.stop();
    Speech.speak(
      "Cross your arms. Stand up and sit down as many times as you can. Go."
    );
  }, [trackingMode]);

  // auto-stop when the timer hits zero
  useEffect(() => {
    if (secondsLeft === 0 && isTracking) {
      handleStop();
    }
  }, [secondsLeft, isTracking, handleStop]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      sessionStartedAtRef.current = null;
      repCountRef.current = 0;
      clearTimer();
      stopTracking();
      Speech.stop();
    };
  }, [stopTracking, clearTimer]);

  // camera renders during gesture wait + countdown + tracking — same widening
  // as exercise-session.tsx so the user can see the skeleton during gesture wait.
  const cameraActive =
    trackingMode !== "idle" && hasPermission && !!device;
  const currentScore = currentFeedback?.score ?? null;
  const band = fallRiskBand(finalReps);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              sessionStartedAtRef.current = null;
              repCountRef.current = 0;
              clearTimer();
              stopTracking();
              Speech.stop();
              router.navigate("/(tabs)/balance-test");
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

        <Text style={styles.pageTitle}>Chair Rise Test</Text>
        <Text style={styles.pageSub}>30-Second Sit-to-Stand</Text>

        {/* Camera area */}
        <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
          {cameraActive && device ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              frameProcessor={frameProcessor}
              pixelFormat="rgb"
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              {!hasPermission ? (
                <>
                  <Ionicons name="camera-outline" size={40} color="#8C7A6C" />
                  <Text style={styles.cameraHint}>Camera access needed</Text>
                  <Text style={styles.cameraSmall}>
                    Tap Start Test to enable the camera.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={40} color="#8C7A6C" />
                  <Text style={styles.cameraHint}>Ready to test</Text>
                  <Text style={styles.cameraSmall}>
                    {exerciseRule?.cameraPrompt ??
                      "Sit in a chair facing the camera with your arms crossed across your chest."}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* skeleton overlays — visible in gesture/countdown/tracking */}
          {trackingMode !== "idle" && currentPose && containerSize.width > 0 && (
            <>
              <GuideOverlay
                pose={currentPose}
                exerciseId={EXERCISE_ID}
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

          {/* timer overlay */}
          {isTracking && secondsLeft !== null && (
            <View style={styles.timerOverlay}>
              <Text
                style={[
                  styles.timerText,
                  secondsLeft <= 5 && styles.timerTextUrgent,
                ]}
              >
                {secondsLeft}s
              </Text>
              <Text style={styles.timerLabel}>remaining</Text>
            </View>
          )}

          {/* form score overlay */}
          {isTracking && currentScore !== null && (
            <View style={styles.scoreOverlay}>
              <Text style={styles.scoreText}>{currentScore}</Text>
              <Text style={styles.scoreLabel}>Form</Text>
            </View>
          )}

          {/* violation overlay (catches the arms-crossed warning) */}
          {isTracking &&
            currentFeedback &&
            currentFeedback.violations.length > 0 && (
              <View style={styles.violationsOverlay}>
                {currentFeedback.violations.slice(0, 2).map((v, i) => (
                  <View
                    key={`${v.bodyPart}-${i}`}
                    style={[
                      styles.violationBadge,
                      v.severity === "error"
                        ? styles.violationError
                        : styles.violationWarning,
                    ]}
                  >
                    <Text style={styles.violationText}>{v.message}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* gesture-confirm + countdown overlay (sits on top of the skeleton).
              renders nothing in idle/tracking modes. */}
          <GestureCountdownOverlay
            trackingMode={trackingMode}
            countdownSecondsLeft={countdownSecondsLeft}
          />
        </View>

        {/* rep counter below camera */}
        {isTracking && repCount !== null && (
          <View
            style={[styles.repCounterBar, repFlash && styles.repCounterFlash]}
          >
            <Text style={styles.repCounterText}>{repCount}</Text>
            <Text style={styles.repCounterLabel}>reps</Text>
          </View>
        )}

        {/* error display */}
        {visionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visionError}</Text>
          </View>
        )}

        {/* summary card after the test ends */}
        {showSummary && !isTracking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Complete</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNumber}>{finalReps}</Text>
              <Text style={styles.scoreUnit}>reps in {finalDurationSec}s</Text>
            </View>
            <View
              style={[styles.bandBox, { borderColor: band.color }]}
            >
              <Text style={[styles.bandText, { color: band.color }]}>
                {band.label}
              </Text>
            </View>
            <Text style={styles.cardFootnote}>
              Compared to a generic elderly threshold. Age- and gender-specific
              norms can be more accurate.
            </Text>
          </View>
        )}

        {/* tips card when truly idle (no gesture flow running) */}
        {trackingMode === "idle" && !showSummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to do this test</Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                {"\u2022"} Sit upright in a sturdy chair without armrests{"\n"}
                {"\u2022"} Cross your arms across your chest{"\n"}
                {"\u2022"} Stand up fully and sit back down — repeat{"\n"}
                {"\u2022"} As many full reps as you can in 30 seconds{"\n"}
                {"\u2022"} The phone announces each rep aloud
              </Text>
            </View>
          </View>
        )}

        {/* controls */}
        <View style={styles.controlsRow}>
          {trackingMode === "tracking" ? (
            <TouchableOpacity
              style={styles.stopBtn}
              activeOpacity={0.9}
              onPress={handleStop}
            >
              <Ionicons name="square" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Stop Early</Text>
            </TouchableOpacity>
          ) : trackingMode === "waiting_for_gesture" ||
            trackingMode === "countdown" ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.9}
              onPress={() => {
                stopTracking();
                Speech.stop();
              }}
            >
              <Ionicons name="close" size={16} color="#5B4636" />
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
          ) : showSummary ? (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.9}
                onPress={() => router.navigate("/(tabs)/balance-test")}
              >
                <Ionicons name="arrow-back" size={16} color="#5B4636" />
                <Text style={styles.secondaryText}>Back to Tests</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.9}
                onPress={handleStart}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.primaryText}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={handleStart}
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Start Test</Text>
            </TouchableOpacity>
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
    gap: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  cameraHint: { color: "#6B5E55", fontWeight: "800", fontSize: 20 },
  cameraSmall: {
    color: "#5B4636",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 26,
  },

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
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  timerText: { fontSize: 28, fontWeight: "900", color: "#222" },
  timerTextUrgent: { color: warmRed },
  timerLabel: { fontSize: 10, fontWeight: "800", color: "#6B5E55", marginTop: 2 },

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
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  scoreText: { fontSize: 28, fontWeight: "900", color: "#1E7A3A" },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B5E55",
    marginTop: 2,
  },

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

  repCounterBar: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: "center",
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
  repCounterText: { fontSize: 50, fontWeight: "900", color: "#222" },
  repCounterLabel: { fontSize: 12, fontWeight: "800", color: "#6B5E55" },
  repCounterFlash: {
    backgroundColor: "#E8F5E9",
    borderColor: "#1E7A3A",
    borderWidth: 2,
  },

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
  cardTitle: { fontWeight: "900", color: "#222", marginBottom: 4, fontSize: 16 },
  cardFootnote: {
    marginTop: 10,
    color: "#8C7A6C",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 12,
  },
  scoreNumber: { fontSize: 48, fontWeight: "900", color: "#222" },
  scoreUnit: { fontSize: 14, fontWeight: "700", color: "#6B5E55" },

  bandBox: {
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  bandText: { fontSize: 16, fontWeight: "900" },

  tipBox: {
    marginTop: 10,
    backgroundColor: beigeStrip,
    borderRadius: 12,
    padding: 12,
  },
  tipText: { color: "#5B4636", fontWeight: "700", lineHeight: 22 },

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
