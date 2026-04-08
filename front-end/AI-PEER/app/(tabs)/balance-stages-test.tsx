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
import { isConfident } from "@/src/vision/exercises/utils";
import { appendExerciseCompletion } from "@/src/exercise-activity-storage";

const EXERCISE_ID = "assessment-2";
const EXERCISE_NAME = "4-Stage Balance Test";

// 10-second hold per stage per CDC STEADI protocol
const STAGE_HOLD_SEC = 10;

// Tolerance for brief stance flicker before failing the hold (ms)
const STANCE_BREAK_TOLERANCE_MS = 500;

/**
 * Stance detection thresholds. STARTING GUESSES — these need iterative tuning
 * on a real device. All ratios are normalized by torso length (left shoulder
 * to left hip), which is a stable per-patient reference visible from a side-on
 * camera angle. (Hip width is unusable from the side because the two hips
 * overlap in 2D.)
 */
const STANCE_THRESHOLDS = {
  // Stage 1 — feet together: ankles overlap horizontally and vertically
  feetTogetherMaxRatioX: 0.1,
  feetTogetherMaxRatioY: 0.06,
  // Stage 2 — semi-tandem: instep of front foot touching big toe of back foot
  semiTandemMinRatioX: 0.1,
  semiTandemMaxRatioX: 0.25,
  semiTandemMaxRatioY: 0.06,
  // Stage 3 — tandem: front heel touching back toe
  tandemMinRatioX: 0.25,
  tandemMaxRatioX: 0.5,
  tandemMaxRatioY: 0.06,
  // Stage 4 — single-leg: one ankle clearly higher than the other
  singleLegMinRatioY: 0.2,
};

type StageId = 1 | 2 | 3 | 4;

type StageDef = {
  id: StageId;
  name: string;
  instruction: string;
  spokenInstruction: string;
};

const STAGES: StageDef[] = [
  {
    id: 1,
    name: "Feet Together",
    instruction: "Stand with your feet side by side, touching.",
    spokenInstruction: "Stage one. Stand with your feet together, touching.",
  },
  {
    id: 2,
    name: "Semi-Tandem",
    instruction:
      "Place the side of one foot touching the big toe of the other foot.",
    spokenInstruction:
      "Stage two. Semi-tandem. Place one foot half a step ahead of the other.",
  },
  {
    id: 3,
    name: "Tandem",
    instruction:
      "Place one foot directly in front of the other, heel touching toe.",
    spokenInstruction:
      "Stage three. Tandem. One foot directly in front of the other, heel touching toe.",
  },
  {
    id: 4,
    name: "Single-Leg",
    instruction: "Lift one foot off the ground and balance on the other.",
    spokenInstruction: "Stage four. Single leg. Lift one foot off the ground.",
  },
];

type SessionState = "idle" | "stage" | "done";
type HoldStatus = "getting_into_position" | "holding";

type StanceMetrics = {
  ratioX: number;
  ratioY: number;
  torso: number;
};

function fallRiskBand(score: number): { label: string; color: string } {
  if (score >= 4) return { label: "Excellent — Low Risk", color: "#1E7A3A" };
  if (score === 3) return { label: "Normal", color: "#1E7A3A" };
  if (score === 2) return { label: "Below Normal", color: "#B8860B" };
  return { label: "Increased Fall Risk", color: warmRed };
}

function verifyStance(stage: StageId, m: StanceMetrics): boolean {
  switch (stage) {
    case 1:
      return (
        m.ratioX < STANCE_THRESHOLDS.feetTogetherMaxRatioX &&
        m.ratioY < STANCE_THRESHOLDS.feetTogetherMaxRatioY
      );
    case 2:
      return (
        m.ratioX >= STANCE_THRESHOLDS.semiTandemMinRatioX &&
        m.ratioX < STANCE_THRESHOLDS.semiTandemMaxRatioX &&
        m.ratioY < STANCE_THRESHOLDS.semiTandemMaxRatioY
      );
    case 3:
      return (
        m.ratioX >= STANCE_THRESHOLDS.tandemMinRatioX &&
        m.ratioX < STANCE_THRESHOLDS.tandemMaxRatioX &&
        m.ratioY < STANCE_THRESHOLDS.tandemMaxRatioY
      );
    case 4:
      return m.ratioY > STANCE_THRESHOLDS.singleLegMinRatioY;
  }
}

export default function BalanceStagesTestPage() {
  const router = useRouter();

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

  // session state
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [currentStage, setCurrentStage] = useState<StageId>(1);
  const [holdStatus, setHoldStatus] = useState<HoldStatus>(
    "getting_into_position"
  );
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(STAGE_HOLD_SEC);
  const [finalScore, setFinalScore] = useState<number>(0);

  const stanceInvalidSinceRef = useRef<number | null>(null);
  const lastMetricsRef = useRef<StanceMetrics | null>(null);

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

  // compute stance metrics from the current pose
  const computeStanceMetrics = useCallback((): StanceMetrics | null => {
    if (!currentPose) return null;
    const lh = currentPose.keypoints.find((k) => k.name === "left_hip");
    const ls = currentPose.keypoints.find((k) => k.name === "left_shoulder");
    const la = currentPose.keypoints.find((k) => k.name === "left_ankle");
    const ra = currentPose.keypoints.find((k) => k.name === "right_ankle");
    if (!lh || !ls || !la || !ra) return null;
    if (
      !isConfident(lh) ||
      !isConfident(ls) ||
      !isConfident(la) ||
      !isConfident(ra)
    )
      return null;

    const torso = Math.abs(ls.y - lh.y);
    if (torso < 0.01) return null;

    const ankleDistX = Math.abs(la.x - ra.x);
    const ankleDistY = Math.abs(la.y - ra.y);

    return {
      ratioX: ankleDistX / torso,
      ratioY: ankleDistY / torso,
      torso,
    };
  }, [currentPose]);

  // finishTest is referenced by pass/fail handlers; declared first
  const finishTest = useCallback(
    (score: number) => {
      setFinalScore(score);
      setSessionState("done");

      void appendExerciseCompletion({
        exerciseId: EXERCISE_ID,
        exerciseName: EXERCISE_NAME,
        category: "assessment",
        repCount: 0,
        durationSec: 0,
        avgScore: score,
        framesAnalyzed: 0,
      }).catch((error) => {
        console.error(
          "[BalanceStagesTest] Failed to save activity record:",
          error
        );
      });

      Speech.stop();
      Speech.speak(`Test complete. You completed ${score} out of 4 stages.`);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      stopTracking();
    },
    [stopTracking]
  );

  const passCurrentStage = useCallback(() => {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    if (currentStage >= 4) {
      finishTest(4);
      return;
    }

    const next = (currentStage + 1) as StageId;
    Speech.stop();
    Speech.speak(`Stage ${currentStage} complete. ${STAGES[next - 1].spokenInstruction}`);

    setCurrentStage(next);
    setHoldStatus("getting_into_position");
    setHoldSecondsLeft(STAGE_HOLD_SEC);
    stanceInvalidSinceRef.current = null;
  }, [currentStage, finishTest]);

  const failCurrentStage = useCallback(() => {
    Speech.stop();
    Speech.speak(`Stage ${currentStage} not held.`);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
    finishTest(currentStage - 1);
  }, [currentStage, finishTest]);

  // pose-watching effect — drives stance verification
  useEffect(() => {
    if (sessionState !== "stage") return;
    const m = computeStanceMetrics();
    if (m === null) return;
    lastMetricsRef.current = m;

    const inStance = verifyStance(currentStage, m);

    if (holdStatus === "getting_into_position") {
      if (inStance) {
        stanceInvalidSinceRef.current = null;
        setHoldStatus("holding");
        setHoldSecondsLeft(STAGE_HOLD_SEC);
      }
      return;
    }

    if (holdStatus === "holding") {
      if (inStance) {
        stanceInvalidSinceRef.current = null;
      } else {
        if (stanceInvalidSinceRef.current === null) {
          stanceInvalidSinceRef.current = Date.now();
        } else if (
          Date.now() - stanceInvalidSinceRef.current >=
          STANCE_BREAK_TOLERANCE_MS
        ) {
          failCurrentStage();
        }
      }
    }
    // intentionally re-run on every new pose frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPose, sessionState, holdStatus, currentStage]);

  // 10-second hold countdown — runs whenever holdStatus enters 'holding'
  useEffect(() => {
    if (sessionState !== "stage" || holdStatus !== "holding") return;
    setHoldSecondsLeft(STAGE_HOLD_SEC);
    Speech.stop();
    Speech.speak(`Hold for ${STAGE_HOLD_SEC} seconds.`);

    const t = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(t);
          passCurrentStage();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sessionState, holdStatus, passCurrentStage]);

  const handleStart = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    if (!modelReady) return;

    setCurrentStage(1);
    setHoldStatus("getting_into_position");
    setHoldSecondsLeft(STAGE_HOLD_SEC);
    setFinalScore(0);
    stanceInvalidSinceRef.current = null;
    lastMetricsRef.current = null;

    startTracking(EXERCISE_ID);
    setSessionState("stage");

    Speech.stop();
    Speech.speak(STAGES[0].spokenInstruction);
  }, [hasPermission, requestPermission, modelReady, startTracking]);

  const handleAbort = useCallback(() => {
    stopTracking();
    Speech.stop();
    setSessionState("idle");
    setHoldStatus("getting_into_position");
    setHoldSecondsLeft(STAGE_HOLD_SEC);
    stanceInvalidSinceRef.current = null;
  }, [stopTracking]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      Speech.stop();
    };
  }, [stopTracking]);

  const cameraActive = isTracking && hasPermission && !!device;
  const stageDef = STAGES[currentStage - 1];
  const band = fallRiskBand(finalScore);

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

        <Text style={styles.pageTitle}>4-Stage Balance Test</Text>
        <Text style={styles.pageSub}>
          {sessionState === "stage"
            ? `Stage ${currentStage} of 4 — ${stageDef.name}`
            : sessionState === "done"
              ? "Test complete"
              : "CDC fall-risk screening"}
        </Text>

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
                    Stand sideways to the camera so your full body — head to
                    feet — is visible. Place your phone about 6-8 feet away.
                    The test has 4 stances, each held for 10 seconds.
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

          {/* Stage instruction overlay (top center) */}
          {sessionState === "stage" && (
            <View style={styles.stageBanner}>
              <Text style={styles.stageBannerStage}>
                STAGE {currentStage} / 4
              </Text>
              <Text style={styles.stageBannerName}>{stageDef.name}</Text>
              <Text style={styles.stageBannerInstruction}>
                {stageDef.instruction}
              </Text>
            </View>
          )}

          {/* Big hold countdown overlay */}
          {sessionState === "stage" && holdStatus === "holding" && (
            <View style={styles.bigCountdownOverlay}>
              <Text style={styles.bigCountdownNumber}>{holdSecondsLeft}</Text>
              <Text style={styles.bigCountdownLabel}>HOLD</Text>
            </View>
          )}

          {/* Getting-into-position prompt */}
          {sessionState === "stage" &&
            holdStatus === "getting_into_position" && (
              <View style={styles.waitingOverlay}>
                <Text style={styles.waitingText}>Get into position...</Text>
              </View>
            )}

          {/* Live metrics debug overlay (right side) */}
          {isTracking && lastMetricsRef.current !== null && (
            <View style={styles.angleOverlay}>
              <Text style={styles.angleText}>
                X:{lastMetricsRef.current.ratioX.toFixed(2)}
              </Text>
              <Text style={styles.angleText}>
                Y:{lastMetricsRef.current.ratioY.toFixed(2)}
              </Text>
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
        {sessionState === "done" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Complete</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNumber}>{finalScore}</Text>
              <Text style={styles.scoreUnit}>of 4 stages</Text>
            </View>
            <View style={[styles.bandBox, { borderColor: band.color }]}>
              <Text style={[styles.bandText, { color: band.color }]}>
                {band.label}
              </Text>
            </View>
            <Text style={styles.cardFootnote}>
              CDC interpretation: failure to hold the tandem stance (stage 3)
              for 10 seconds indicates increased fall risk.
            </Text>
          </View>
        )}

        {/* tips card when idle */}
        {sessionState === "idle" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to do this test</Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                {"\u2022"} You will progress through 4 standing stances{"\n"}
                {"\u2022"} Each stance must be held for 10 seconds{"\n"}
                {"\u2022"} Stage 1: feet together, side by side{"\n"}
                {"\u2022"} Stage 2: one foot half a step ahead{"\n"}
                {"\u2022"} Stage 3: heel touching the toe of the other foot{"\n"}
                {"\u2022"} Stage 4: lift one foot off the ground{"\n"}
                {"\u2022"} The test stops at the first stage you cannot hold
              </Text>
            </View>
          </View>
        )}

        {/* controls */}
        <View style={styles.controlsRow}>
          {sessionState === "idle" ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={handleStart}
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.primaryText}>Start Test</Text>
            </TouchableOpacity>
          ) : sessionState === "done" ? (
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

  stageBanner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  stageBannerStage: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2E5AAC",
    letterSpacing: 1,
  },
  stageBannerName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222",
    marginTop: 2,
  },
  stageBannerInstruction: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B4636",
    marginTop: 4,
    lineHeight: 18,
  },

  bigCountdownOverlay: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bigCountdownNumber: {
    fontSize: 140,
    fontWeight: "900",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bigCountdownLabel: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  waitingOverlay: {
    position: "absolute",
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: "rgba(46,90,172,0.92)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  waitingText: { color: "#FFF", fontWeight: "900", fontSize: 14 },

  angleOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  angleText: { fontSize: 14, fontWeight: "900", color: "#0F0" },

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
