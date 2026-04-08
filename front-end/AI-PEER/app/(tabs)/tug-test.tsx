import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
import { getExerciseRules } from "@/src/vision/exercises";
import { calculateAngle3D, isConfident } from "@/src/vision/exercises/utils";
import { appendExerciseCompletion } from "@/src/exercise-activity-storage";

const EXERCISE_ID = "assessment-3";
const EXERCISE_NAME = "Timed Up and Go";

// State machine thresholds
const READY_COUNTDOWN_SEC = 10;
const STAND_THRESHOLD = 145; // 3D knee angle ≥ this means standing
const SIT_THRESHOLD = 125;   // 3D knee angle ≤ this means seated
const FRAMES_REQUIRED = 2;   // require N consecutive frames in zone (noise rejection)
const LOCKOUT_MS = 5000;     // ignore knee angle for 5s after the initial stand

type TugState =
  | "idle"
  | "getting_ready"
  | "waiting_for_stand"
  | "walking"
  | "waiting_for_final_sit"
  | "done";

function tugFallRiskBand(seconds: number): { label: string; color: string } {
  if (seconds < 12) return { label: "Normal", color: "#1E7A3A" };
  return { label: "Increased Fall Risk", color: warmRed };
}

function stateLabel(state: TugState): string {
  switch (state) {
    case "idle":
      return "Ready when you are";
    case "getting_ready":
      return "Get ready...";
    case "waiting_for_stand":
      return "Stand up to start the test";
    case "walking":
      return "Walking — go to the marker and back";
    case "waiting_for_final_sit":
      return "Sit down to finish";
    case "done":
      return "Test complete";
  }
}

export default function TugTestPage() {
  const router = useRouter();

  const exerciseRule = useMemo(() => getExerciseRules(EXERCISE_ID), []);

  const modelReady = true;

  const {
    isTracking,
    currentPose,
    currentFeedback,
    error: visionError,
    setModelReady,
    startTracking,
    stopTracking,
    handlePoseResult,
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

  // state machine
  const [tugState, setTugState] = useState<TugState>("idle");
  const [readySec, setReadySec] = useState<number>(READY_COUNTDOWN_SEC);
  const [walkSec, setWalkSec] = useState<number>(0);
  const [finalElapsed, setFinalElapsed] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);
  const lockoutEndsAtRef = useRef<number>(0);
  const framesInTargetRef = useRef<number>(0);
  const lastKneeAngleRef = useRef<number | null>(null);

  // frame processor wiring
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

  // compute the 3D knee angle from the latest pose
  const computeKneeAngle = useCallback((): number | null => {
    if (!currentPose) return null;
    const hip = currentPose.keypoints.find((k) => k.name === "left_hip");
    const knee = currentPose.keypoints.find((k) => k.name === "left_knee");
    const ankle = currentPose.keypoints.find((k) => k.name === "left_ankle");
    if (!hip || !knee || !ankle) return null;
    if (!isConfident(hip) || !isConfident(knee) || !isConfident(ankle))
      return null;
    return calculateAngle3D(hip, knee, ankle);
  }, [currentPose]);

  // pose-watching effect — runs the state machine transitions that depend on knee angle
  useEffect(() => {
    if (!isTracking) return;
    if (
      tugState !== "waiting_for_stand" &&
      tugState !== "waiting_for_final_sit"
    )
      return;

    const angle = computeKneeAngle();
    if (angle === null) return;
    lastKneeAngleRef.current = angle;

    if (tugState === "waiting_for_stand") {
      if (angle >= STAND_THRESHOLD) {
        framesInTargetRef.current += 1;
        if (framesInTargetRef.current >= FRAMES_REQUIRED) {
          framesInTargetRef.current = 0;
          startTimeRef.current = Date.now();
          lockoutEndsAtRef.current = Date.now() + LOCKOUT_MS;
          setTugState("walking");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {}
          );
        }
      } else {
        framesInTargetRef.current = 0;
      }
    } else if (tugState === "waiting_for_final_sit") {
      if (angle <= SIT_THRESHOLD) {
        framesInTargetRef.current += 1;
        if (framesInTargetRef.current >= FRAMES_REQUIRED) {
          framesInTargetRef.current = 0;
          const startedAt = startTimeRef.current ?? Date.now();
          const elapsed = Math.round((Date.now() - startedAt) / 1000);
          finishTest(elapsed);
        }
      } else {
        framesInTargetRef.current = 0;
      }
    }
    // we deliberately depend on currentPose to run on every new frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPose, tugState, isTracking]);

  // walking → waiting_for_final_sit transition (after 5s lockout)
  useEffect(() => {
    if (tugState !== "walking") return;
    const remaining = lockoutEndsAtRef.current - Date.now();
    if (remaining <= 0) {
      setTugState("waiting_for_final_sit");
      return;
    }
    const t = setTimeout(() => setTugState("waiting_for_final_sit"), remaining);
    return () => clearTimeout(t);
  }, [tugState]);

  // running elapsed-time display while walking and waiting_for_final_sit
  useEffect(() => {
    if (tugState !== "walking" && tugState !== "waiting_for_final_sit") return;
    if (startTimeRef.current === null) return;
    const t = setInterval(() => {
      if (startTimeRef.current === null) return;
      setWalkSec((Date.now() - startTimeRef.current) / 1000);
    }, 100);
    return () => clearInterval(t);
  }, [tugState]);

  // getting_ready 10-second countdown
  useEffect(() => {
    if (tugState !== "getting_ready") return;
    setReadySec(READY_COUNTDOWN_SEC);
    Speech.stop();
    Speech.speak(
      "Get ready. Sit in your chair facing the camera. The test will start in 10 seconds."
    );

    const t = setInterval(() => {
      setReadySec((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(t);
          Speech.stop();
          Speech.speak(
            "Stand up, walk to the marker, turn around, and come back to sit."
          );
          framesInTargetRef.current = 0;
          setTugState("waiting_for_stand");
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tugState]);

  const finishTest = useCallback(
    (elapsedSeconds: number) => {
      setFinalElapsed(elapsedSeconds);
      setTugState("done");

      void appendExerciseCompletion({
        exerciseId: EXERCISE_ID,
        exerciseName: EXERCISE_NAME,
        category: "assessment",
        repCount: 0,
        durationSec: elapsedSeconds,
        avgScore: elapsedSeconds, // the test score IS the time
        framesAnalyzed: 0,
      }).catch((error) => {
        console.error("[TugTest] Failed to save activity record:", error);
      });

      const band = tugFallRiskBand(elapsedSeconds);
      Speech.stop();
      Speech.speak(
        `Test complete. ${elapsedSeconds} seconds. ${band.label}.`
      );
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      stopTracking();
    },
    [stopTracking]
  );

  const handleStart = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    if (!modelReady) return;

    // reset state
    startTimeRef.current = null;
    lockoutEndsAtRef.current = 0;
    framesInTargetRef.current = 0;
    lastKneeAngleRef.current = null;
    setWalkSec(0);
    setFinalElapsed(0);
    setReadySec(READY_COUNTDOWN_SEC);

    startTracking(EXERCISE_ID);
    setTugState("getting_ready");
  }, [hasPermission, requestPermission, modelReady, startTracking]);

  const handleAbort = useCallback(() => {
    stopTracking();
    Speech.stop();
    setTugState("idle");
    startTimeRef.current = null;
    setWalkSec(0);
  }, [stopTracking]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      startTimeRef.current = null;
      stopTracking();
      Speech.stop();
    };
  }, [stopTracking]);

  const cameraActive = isTracking && hasPermission && !!device;
  const band = tugFallRiskBand(finalElapsed);

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
              handleAbort();
              router.replace("/(tabs)/balance-test");
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

        <Text style={styles.pageTitle}>Timed Up and Go</Text>
        <Text style={styles.pageSub}>{stateLabel(tugState)}</Text>

        {/* Camera area */}
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
                      "Sit in a chair facing the camera with 8-10 feet of clear floor space ahead."}
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

          {/* Get-ready countdown overlay */}
          {tugState === "getting_ready" && (
            <View style={styles.bigCountdownOverlay}>
              <Text style={styles.bigCountdownNumber}>{readySec}</Text>
              <Text style={styles.bigCountdownLabel}>Get ready</Text>
            </View>
          )}

          {/* Running timer overlay (walking + waiting_for_final_sit) */}
          {(tugState === "walking" || tugState === "waiting_for_final_sit") && (
            <View style={styles.timerOverlay}>
              <Text style={styles.timerText}>{walkSec.toFixed(1)}s</Text>
              <Text style={styles.timerLabel}>elapsed</Text>
            </View>
          )}

          {/* live knee-angle debug overlay (right side) */}
          {isTracking && lastKneeAngleRef.current !== null && (
            <View style={styles.angleOverlay}>
              <Text style={styles.angleText}>
                {Math.round(lastKneeAngleRef.current)}°
              </Text>
              <Text style={styles.angleLabel}>knee 3D</Text>
            </View>
          )}
        </View>

        {/* error display */}
        {visionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visionError}</Text>
          </View>
        )}

        {/* summary card after the test ends */}
        {tugState === "done" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Complete</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNumber}>{finalElapsed}</Text>
              <Text style={styles.scoreUnit}>seconds</Text>
            </View>
            <View style={[styles.bandBox, { borderColor: band.color }]}>
              <Text style={[styles.bandText, { color: band.color }]}>
                {band.label}
              </Text>
            </View>
            <Text style={styles.cardFootnote}>
              CDC threshold: under 12 seconds is considered normal; 12 seconds
              or more indicates increased fall risk.
            </Text>
          </View>
        )}

        {/* tips card when idle */}
        {tugState === "idle" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to do this test</Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                {"\u2022"} Sit in a sturdy chair facing the camera{"\n"}
                {"\u2022"} Place a marker about 3 meters (10 feet) away{"\n"}
                {"\u2022"} On the cue, stand up{"\n"}
                {"\u2022"} Walk to the marker, turn around, walk back{"\n"}
                {"\u2022"} Sit down — the test ends automatically{"\n"}
                {"\u2022"} The phone will give you 10 seconds to get ready
              </Text>
            </View>
          </View>
        )}

        {/* controls */}
        <View style={styles.controlsRow}>
          {tugState === "idle" ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={handleStart}
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Start Test</Text>
            </TouchableOpacity>
          ) : tugState === "done" ? (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.9}
                onPress={() => router.replace("/(tabs)/balance-test")}
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
              style={styles.stopBtn}
              activeOpacity={0.9}
              onPress={handleAbort}
            >
              <Ionicons name="square" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Cancel</Text>
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

  bigCountdownOverlay: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bigCountdownNumber: {
    fontSize: 120,
    fontWeight: "900",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bigCountdownLabel: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  timerLabel: { fontSize: 10, fontWeight: "800", color: "#6B5E55", marginTop: 2 },

  angleOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  angleText: { fontSize: 22, fontWeight: "900", color: "#0F0" },
  angleLabel: { fontSize: 10, fontWeight: "800", color: "#AAA", marginTop: 2 },

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
