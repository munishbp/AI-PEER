/**
 * GestureCountdownOverlay
 *
 * Renders the two pre-tracking states from the VisionContext gesture flow:
 * - 'waiting_for_gesture': prompts the user to raise both arms overhead.
 *   Speaks the prompt once when entering this state.
 * - 'countdown': big 5-4-3-2-1 number, with a TTS tick on each new value.
 *
 * The overlay is positioned absolutely so it sits on top of the camera/skeleton
 * view in each session screen. The screens decide WHEN to render it (gated on
 * trackingMode); this component only handles HOW it looks and the audio cues.
 *
 * The actual gesture detection, the 500ms hold, and the countdown timer all
 * live in VisionContext — this component is purely presentational.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

type Props = {
  trackingMode: "idle" | "waiting_for_gesture" | "countdown" | "tracking";
  countdownSecondsLeft: number | null;
};

export function GestureCountdownOverlay({
  trackingMode,
  countdownSecondsLeft,
}: Props) {
  // speak the prompt once when entering waiting_for_gesture
  useEffect(() => {
    if (trackingMode === "waiting_for_gesture") {
      Speech.stop();
      Speech.speak("Raise both arms overhead to start.");
    }
  }, [trackingMode]);

  // speak each countdown tick. cancel any in-flight speech first so the
  // newer number always wins (otherwise "five" can still be playing while
  // we want to say "four").
  useEffect(() => {
    if (trackingMode === "countdown" && countdownSecondsLeft !== null) {
      Speech.stop();
      Speech.speak(String(countdownSecondsLeft));
    }
  }, [trackingMode, countdownSecondsLeft]);

  if (trackingMode !== "waiting_for_gesture" && trackingMode !== "countdown") {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {trackingMode === "waiting_for_gesture" && (
        <View style={styles.gestureBox}>
          <Ionicons name="arrow-up-outline" size={48} color="#FFF" />
          <Text style={styles.gestureTitle}>
            Raise both arms overhead to start
          </Text>
          <Text style={styles.gestureSub}>
            Hold the position for half a second
          </Text>
        </View>
      )}

      {trackingMode === "countdown" && countdownSecondsLeft !== null && (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownNumber}>{countdownSecondsLeft}</Text>
          <Text style={styles.countdownLabel}>Get ready</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  gestureBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 18,
    gap: 12,
    maxWidth: "85%",
  },
  gestureTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  gestureSub: {
    color: "#E8DAD0",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  countdownBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNumber: {
    color: "#FFF",
    fontSize: 140,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: -8,
  },
});
