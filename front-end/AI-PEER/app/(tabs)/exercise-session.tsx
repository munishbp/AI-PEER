// app/exercise-session.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

type CatKey = "warmup" | "strength" | "balance";

function prettyCat(cat?: string) {
  if (cat === "warmup") return "Warm-Up";
  if (cat === "strength") return "Strength";
  if (cat === "balance") return "Balance";
  return "Exercise";
}

export default function ExerciseSessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cat?: CatKey }>();
  const title = useMemo(() => prettyCat(params.cat), [params.cat]);

  // Placeholder states for future vision model integration
  const [trackingState, setTrackingState] = useState<"idle" | "calibrating" | "tracking" | "lost">("idle");
  const [score, setScore] = useState<number | null>(null);

  const startTracking = () => {
    // later: request camera permission + start frame pipeline
    setTrackingState("calibrating");
    setScore(null);

    // quick fake transition so UI is wired (replace with real AI later)
    setTimeout(() => {
      setTrackingState("tracking");
      setScore(90);
    }, 900);
  };

  const stopTracking = () => {
    setTrackingState("idle");
    setScore(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={18} color="#3D2F27" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />
          <Ionicons name="shield-checkmark-outline" size={18} color="#2E5AAC" />
        </View>

        <Text style={styles.pageTitle}>{title} Session</Text>
        <Text style={styles.pageSub}>
          This screen is where the Vision AI monitoring will be integrated.
        </Text>

        {/* Camera preview placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Camera View</Text>
          <View style={styles.cameraBox}>
            <Ionicons name="camera-outline" size={34} color="#8C7A6C" />
            <Text style={styles.cameraHint}>Camera preview placeholder</Text>
            <Text style={styles.cameraSmall}>
              Later: live preview + pose/keypoint overlay
            </Text>
          </View>
        </View>

        {/* Live feedback panel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Feedback</Text>

          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackLabel}>Tracking:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{trackingState.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackLabel}>Score:</Text>
            <Text style={styles.feedbackValue}>{score === null ? "—" : `${score} / 100`}</Text>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Tips</Text>
            <Text style={styles.tipText}>
              • Place your phone so your full body is visible{"\n"}
              • Use good lighting{"\n"}
              • Stand ~6–8 feet away
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={stopTracking}>
            <Ionicons name="square" size={16} color="#5B4636" />
            <Text style={styles.secondaryText}>Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={startTracking}>
            <Ionicons name="play" size={16} color="#FFF" />
            <Text style={styles.primaryText}>Start Monitoring</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeStrip = "#F3E7D9";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 6 },
  backText: { fontWeight: "900", color: "#3D2F27" },

  pageTitle: { fontSize: 18, fontWeight: "900", color: "#222", marginTop: 4 },
  pageSub: { color: "#6B5E55", fontWeight: "600" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "900", color: "#222" },

  cameraBox: {
    marginTop: 10,
    height: 240,
    borderRadius: 12,
    backgroundColor: "#FFF7F1",
    borderWidth: 1,
    borderColor: "#F0E0D4",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cameraHint: { color: "#6B5E55", fontWeight: "800" },
  cameraSmall: { color: "#8C7A6C", fontWeight: "700", textAlign: "center" },

  feedbackRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  feedbackLabel: { width: 90, fontWeight: "900", color: "#3D2F27" },
  feedbackValue: { fontWeight: "900", color: "#1E7A3A" },

  badge: {
    backgroundColor: beigeStrip,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: { fontWeight: "900", color: "#5B4636" },

  tipBox: {
    marginTop: 12,
    backgroundColor: beigeStrip,
    borderRadius: 12,
    padding: 12,
  },
  tipTitle: { fontWeight: "900", color: "#3D2F27", marginBottom: 6 },
  tipText: { color: "#5B4636", fontWeight: "700", lineHeight: 18 },

  controlsRow: { flexDirection: "row", gap: 10 },
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
  primaryText: { fontWeight: "900", color: "#FFF" },
});
