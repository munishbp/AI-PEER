import React, { useState } from "react";
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

type CategoryKey = "warmup" | "strength" | "balance";

type Category = {
  key: CategoryKey;
  title: string;
  subtitle: string;
  purpose: string;
  score: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
};

type VideoItem = {
  id: string;
  duration: string; // keep only what we can show without backend
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

// ✅ Mock video counts/rows (no thumbnails yet)
const VIDEO_LIBRARY: Record<CategoryKey, VideoItem[]> = {
  warmup: [
    { id: "wu-1", duration: "2:10" },
    { id: "wu-2", duration: "3:05" },
    { id: "wu-3", duration: "2:45" },
  ],
  strength: [
    { id: "st-1", duration: "4:20" },
    { id: "st-2", duration: "3:30" },
  ],
  balance: [
    { id: "ba-1", duration: "3:40" },
    { id: "ba-2", duration: "3:15" },
    { id: "ba-3", duration: "4:05" },
  ],
};

export default function ExercisePage() {
  const router = useRouter();

  const [openFolders, setOpenFolders] = useState<Record<CategoryKey, boolean>>({
    warmup: false,
    strength: false,
    balance: false,
  });

  const startCategory = (key: CategoryKey) => {
    router.push({
      pathname: "/(tabs)/exercise-session",
      params: { cat: key },
    });
  };

  const toggleFolder = (key: CategoryKey) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openVideo = (cat: CategoryKey, videoId: string) => {
    // ✅ For now: route to the session screen (or replace later with a video player screen)
    router.push({
      pathname: "/(tabs)/exercise-session",
      params: { cat, video: videoId },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
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

        {/* Segmented */}
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

        {/* Center heading */}
        <View style={styles.centerHead}>
          <Text style={styles.centerTitle}>Exercise Categories</Text>
          <Text style={styles.centerSub}>
            Choose a category to start your workout
          </Text>
        </View>

        {/* Category cards */}
        <View style={{ gap: 18 }}>
          {CATEGORIES.map((c) => {
            const videos = VIDEO_LIBRARY[c.key];
            const isOpen = openFolders[c.key];

            return (
              <View key={c.key} style={styles.categoryCard}>
                {/* Top row */}
                <View style={styles.catTopRow}>
                  <View style={[styles.iconCircle, { backgroundColor: c.iconBg }]}>
                    <Ionicons name={c.icon} size={18} color="#8A5A3C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catTitle}>{c.title}</Text>
                    <Text style={styles.catSubtitle}>{c.subtitle}</Text>
                  </View>
                </View>

                {/* Info strip */}
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

                {/* ✅ Folder tab (Videos) */}
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => toggleFolder(c.key)}
                    style={styles.folderTab}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons
                        name="folder-open-outline"
                        size={18}
                        color="#3D2F27"
                      />
                      <Text style={styles.folderTitle}>Videos</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{videos.length}</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={
                        isOpen ? "chevron-up-outline" : "chevron-down-outline"
                      }
                      size={18}
                      color="#6B5E55"
                    />
                  </TouchableOpacity>

                  {/* ✅ Placeholder-only list (no thumbnails yet) */}
                  {isOpen && (
                    <View style={styles.videoList}>
                      {videos.map((v) => (
                        <TouchableOpacity
                          key={v.id}
                          activeOpacity={0.85}
                          onPress={() => openVideo(c.key, v.id)}
                          style={styles.videoRow}
                        >
                          <View style={styles.videoPlaceholderIcon}>
                            <Ionicons
                              name="play-circle-outline"
                              size={26}
                              color="#8C7A6C"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.videoName}>
                              Video placeholder
                            </Text>
                            <Text style={styles.videoMeta}>{v.duration}</Text>
                          </View>

                          <Ionicons
                            name="chevron-forward-outline"
                            size={18}
                            color="#8C7A6C"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const beige = "#F7EDE4";
const beigeTrack = "#F4E3D6";
const beigeStrip = "#F3E7D9";
const beigeDark = "#E6D4C6";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center" },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 4, marginBottom: 10, color: "#6B5E55" },

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

  /** Folder tab + list */
  folderTab: {
    backgroundColor: "#FFF7F1",
    borderWidth: 1,
    borderColor: "#F0E0D4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  folderTitle: { fontWeight: "900", color: "#3D2F27" },
  countPill: {
    backgroundColor: "#EDE3D9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E0D3C7",
  },
  countText: { fontWeight: "900", color: "#6B5E55", fontSize: 12 },

  videoList: { marginTop: 10, gap: 10 },
  videoRow: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoPlaceholderIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: beigeStrip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: beigeDark,
  },
  videoName: { fontWeight: "900", color: "#222" },
  videoMeta: { marginTop: 2, color: "#6B5E55", fontWeight: "700", fontSize: 12 },

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