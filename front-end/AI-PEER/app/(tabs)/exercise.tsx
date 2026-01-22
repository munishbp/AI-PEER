// app/exercise.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Category = {
  key: "warmup" | "strength" | "balance";
  title: string;
  subtitle: string;
  purpose: string;
  score: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
};

const CATEGORIES: Category[] = [
  {
    key: "warmup",
    title: "Warm-Up",
    subtitle: "Gentle movements to loosen muscles",
    purpose: "Light activities to prepare for exercise",
    score: 92,
    icon: "flame-outline",
    iconBg: "#FFE9DA",
  },
  {
    key: "strength",
    title: "Strength",
    subtitle: "Targeted exercises to increase strength",
    purpose: "Builds muscle power",
    score: 88,
    icon: "barbell-outline",
    iconBg: "#E8F0FF",
  },
  {
    key: "balance",
    title: "Balance",
    subtitle: "Exercises to enhance balance and prevent falls",
    purpose: "Improves stability and coordination",
    score: 90,
    icon: "walk-outline",
    iconBg: "#F0E9FF",
  },
];

export default function ExercisePage() {
  const router = useRouter();

  const startCategory = (key: Category["key"]) => {
    // NEW: go to the Session screen (where Vision AI will live later)
    router.push({
      pathname: "/exercise-session",
      params: { cat: key },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header: match dashboard vibe */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#2E5AAC"
            />
            <Text style={styles.brand}>AI PEER</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="moon-outline" size={18} color="#555" />
          <Ionicons
            name="notifications-outline"
            size={18}
            color="#555"
            style={{ marginLeft: 12 }}
          />
        </View>
        <Text style={styles.subtitle}>Exercise</Text>

        {/* Segmented: Overview | Exercise */}
        <View style={styles.segmentOuter}>
          <TouchableOpacity
            style={styles.segmentBtn}
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)")}
          >
            <Ionicons name="home-outline" size={14} />
            <Text style={styles.segmentText}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, styles.segmentActive]}
            activeOpacity={1}
          >
            <Ionicons name="barbell-outline" size={14} color="#FFF" />
            <Text style={[styles.segmentText, styles.segmentTextActive]}>
              Exercise
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center Title */}
        <View style={styles.centerHead}>
          <Text style={styles.centerTitle}>Exercise Categories</Text>
          <Text style={styles.centerSub}>
            Choose a category to start your workout
          </Text>
        </View>

        {/* Category cards */}
        <View style={{ gap: 18 }}>
          {CATEGORIES.map((c) => (
            <View key={c.key} style={styles.categoryCard}>
              {/* Top row: icon + title/subtitle */}
              <View style={styles.catTopRow}>
                <View style={[styles.iconCircle, { backgroundColor: c.iconBg }]}>
                  <Ionicons name={c.icon} size={18} color="#8A5A3C" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.catTitle}>{c.title}</Text>
                  <Text style={styles.catSubtitle}>{c.subtitle}</Text>
                </View>
              </View>

              {/* Beige info strip with score pill on right */}
              <View style={styles.infoStrip}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Purpose:</Text> {c.purpose}
                  </Text>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Recommendation Score</Text>
                  </Text>
                </View>

                <View style={styles.scorePill}>
                  <Text style={styles.scoreText}>{c.score} / 100</Text>
                </View>
              </View>

              {/* NEW: Always-visible demo video placeholder */}
              <View style={styles.videoPlaceholder}>
                <View style={styles.videoTopRow}>
                  <Ionicons name="videocam-outline" size={16} color="#6B5E55" />
                  <Text style={styles.videoTitle}>Demo Video</Text>
                </View>
                <View style={styles.videoBox}>
                  <Ionicons name="play-circle-outline" size={34} color="#8C7A6C" />
                  <Text style={styles.videoHint}>Video placeholder</Text>
                </View>
              </View>

              {/* Start button */}
              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.9}
                onPress={() => startCategory(c.key)}
              >
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.startText}>Start {c.title}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeTrack = "#F4E3D6";
const beigeStrip = "#F3E7D9";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center" },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 4, marginBottom: 10, color: "#6B5E55" },

  // Segmented control
  segmentOuter: {
    backgroundColor: beigeTrack,
    borderRadius: 999,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  segmentActive: { backgroundColor: warmRed },
  segmentText: { fontWeight: "800", color: "#7A6659" },
  segmentTextActive: { color: "#FFF" },

  centerHead: { alignItems: "center", marginBottom: 16 },
  centerTitle: { fontSize: 16, fontWeight: "900", color: "#222" },
  centerSub: { marginTop: 4, color: "#6B5E55", fontWeight: "600" },

  categoryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
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

  catTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: { fontSize: 14, fontWeight: "900", color: "#222" },
  catSubtitle: { marginTop: 2, color: "#6B5E55", fontWeight: "600" },

  infoStrip: {
    marginTop: 14,
    backgroundColor: beigeStrip,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: { color: "#3D2F27", fontWeight: "600" },
  infoLabel: { fontWeight: "900" },

  scorePill: {
    backgroundColor: "#DDF5E6",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#BDE8CC",
    alignSelf: "flex-end",
  },
  scoreText: { fontWeight: "900", color: "#1E7A3A" },

  // NEW: Demo video placeholder styles
  videoPlaceholder: { marginTop: 12 },
  videoTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  videoTitle: { fontWeight: "900", color: "#3D2F27" },
  videoBox: {
    height: 170,
    borderRadius: 12,
    backgroundColor: "#FFF7F1",
    borderWidth: 1,
    borderColor: "#F0E0D4",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoHint: { color: "#6B5E55", fontWeight: "700" },

  startBtn: {
    marginTop: 12,
    backgroundColor: warmRed,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startText: { color: "#FFF", fontWeight: "900" },
});
