import React, { useState, useCallback, useMemo } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { usePrefs } from "../../src/prefs-context";
import { getExerciseVideos } from "@/src/video";
import { getTodaysRemainingWorkout } from "@/src/daily-workout";
import { WorkoutCombo } from "@/src/workout-combos";
import { getExerciseRules } from "@/src/vision/exercises";
import { useTranslation } from "react-i18next";
import { type ContrastPalette } from "../../src/theme";

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

function exerciseName(id: string): string {
  return getExerciseRules(id)?.name ?? id;
}

export default function ExercisePage() {
  const router = useRouter();
  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [todaysWorkout, setTodaysWorkout] = useState<WorkoutCombo | null>(null);

  const CATEGORIES: Category[] = [
    {
      key: "warmup",
      title: t("exercise.warmupTitle"),
      subtitle: t("exercise.warmupSubtitle"),
      purpose: t("exercise.warmupPurpose"),
      score: 92,
      icon: "flame-outline",
      iconBg: "#FFE9DA",
    },
    {
      key: "strength",
      title: t("exercise.strengthTitle"),
      subtitle: t("exercise.strengthSubtitle"),
      purpose: t("exercise.strengthPurpose"),
      score: 88,
      icon: "barbell-outline",
      iconBg: "#E8F0FF",
    },
    {
      key: "balance",
      title: t("exercise.balanceTitle"),
      subtitle: t("exercise.balanceSubtitle"),
      purpose: t("exercise.balancePurpose"),
      score: 90,
      icon: "walk-outline",
      iconBg: "#F0E9FF",
    },
  ];

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTodaysRemainingWorkout()
        .then((w) => {
          if (active) setTodaysWorkout(w);
        })
        .catch(console.error);
      return () => {
        active = false;
      };
    }, [])
  );

  const [openFolders, setOpenFolders] = useState<Record<CategoryKey, boolean>>({
    warmup: false,
    strength: false,
    balance: false,
  });

  const startCategory = (key: CategoryKey) => {
    router.replace({
      pathname: "/(tabs)/exercise-session",
      params: { cat: key },
    });
  };

  const toggleFolder = (key: CategoryKey) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openVideo = (cat: CategoryKey, exerciseId: string, name: string) => {
    router.replace({
      pathname: "/(tabs)/video-confirm",
      params: {
        cat,
        video: exerciseId,
        label: name,
      },
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
              color={colors.accent}
            />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2/2 }]}>{t("exercise.exercisePage")}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace("/tutorial?next=tabs")}
              accessibilityLabel={t("settings.help")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented */}
        <View style={styles.segmentOuter}>
          <TouchableOpacity
            style={styles.segmentBtn}
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)")}
          >
            <Ionicons name="home-outline" size={14} />
            <Text style={[styles.segmentText, { fontSize: scaled.base }]}>{t("exercise.overview")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, styles.segmentActive]}
          >
            <Ionicons name="barbell-outline" size={14} color="#FFF" />
            <Text style={[styles.segmentText, styles.segmentTextActive, { fontSize: scaled.base }]}>
              {t("exercise.exercise")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center heading */}
        <View style={styles.centerHead}>
          <Text style={styles.centerTitle}>{t("exercise.exerciseCategories")}</Text>
          <Text style={styles.centerSub}>{t("exercise.categoriesDescription")}</Text>
        </View>

        {/* Today's Workout */}
        {todaysWorkout && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#FFE9DA" }]}>
                <Ionicons name="fitness-outline" size={18} color="#8A5A3C" />
              </View>
              <Text style={styles.todayTitle}>{t("exercise.todayWorkout")}</Text>
            </View>

            {([
              { label: t("exercise.warmupTitle"), ids: todaysWorkout.warmup, cat: "warmup" as CategoryKey },
              { label: t("exercise.strengthTitle"), ids: todaysWorkout.strength, cat: "strength" as CategoryKey },
              { label: t("exercise.balanceTitle"), ids: todaysWorkout.balance, cat: "balance" as CategoryKey },
            ]).map((group) => (
              <View key={group.label} style={styles.todayGroup}>
                <Text style={styles.todayGroupLabel}>{group.label}</Text>
                {group.ids.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.todayExercise}
                    activeOpacity={0.8}
                    onPress={() => openVideo(group.cat, id, exerciseName(id))}
                  >
                    <Ionicons name="play-circle-outline" size={18} color={colors.accent} />
                    <Text style={styles.todayExerciseText}>{exerciseName(id)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Category cards */}
        <View style={{ gap: 18 }}>
          {CATEGORIES.map((c) => {
            const videos = getExerciseVideos(c.key);
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
                      <Text style={styles.infoLabel}>{t("exercise.purpose")}</Text> {c.purpose}
                    </Text>
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
                        color={colors.text}
                      />
                      <Text style={styles.folderTitle}>{t("exercise.videos")}</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{videos.length}</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={
                        isOpen ? "chevron-up-outline" : "chevron-down-outline"
                      }
                      size={18}
                      color={colors.muted}
                    />
                  </TouchableOpacity>

                  {/* ✅ Placeholder-only list (no thumbnails yet) */}
                  {isOpen && (
                    <View style={styles.videoList}>
                      {videos.map((v) => (
                        <TouchableOpacity
                          key={v.exerciseId}
                          activeOpacity={0.85}
                          onPress={() => openVideo(c.key, v.exerciseId, v.name)}
                          style={styles.videoRow}
                        >
                          <View style={styles.videoPlaceholderIcon}>
                            <Ionicons
                              name="play-circle-outline"
                              size={26}
                              color={colors.muted}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.videoName}>
                              {v.name}
                            </Text>
                          </View>

                          <Ionicons
                            name="chevron-forward-outline"
                            size={18}
                            color={colors.muted}
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
                  <Text style={styles.startText}>{t("exercise.start")} {c.title}</Text>
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

const createStyles = (colors: ContrastPalette) => {
  const beige = colors.background;
  const beigeTrack = colors.bgTile;
  const beigeStrip = colors.bgTile;
  const beigeDark = colors.bgTile;
  const warmRed = colors.accent;

  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: colors.text },
  subtitle: { marginTop: 3, marginBottom: 6, color: colors.muted },

  segmentOuter: {
    backgroundColor: beigeTrack,
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  segmentActive: { backgroundColor: warmRed },
  segmentText: { fontWeight: "800", color: colors.muted },
  segmentTextActive: { color: "#FFF" },

  centerHead: { alignItems: "center", marginBottom: 16 },
  centerTitle: { fontSize: 16, fontWeight: "900", color: colors.text },
  centerSub: { marginTop: 4, color: colors.muted, fontWeight: "600" },

  categoryCard: {
    backgroundColor: colors.bgTile,
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
  catTitle: { fontSize: 14, fontWeight: "900", color: colors.text },
  catSubtitle: { marginTop: 2, color: colors.muted, fontWeight: "600" },

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
  infoText: { color: colors.text, fontWeight: "600" },
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
  folderTitle: { fontWeight: "900", color: colors.text },
  countPill: {
    backgroundColor: "#EDE3D9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E0D3C7",
  },
  countText: { fontWeight: "900", color: colors.muted, fontSize: 12 },

  videoList: { marginTop: 10, gap: 10 },
  videoRow: {
    backgroundColor: colors.bgTile,
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
  videoName: { fontWeight: "900", color: colors.text },
  videoMeta: { marginTop: 2, color: colors.muted, fontWeight: "700", fontSize: 12 },

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

  todayCard: {
    backgroundColor: colors.bgTile,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  todayTitle: { fontSize: 16, fontWeight: "900", color: colors.text },
  todayGroup: { marginBottom: 10 },
  todayGroupLabel: { fontSize: 12, fontWeight: "900", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  todayExercise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F7F2EE",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  todayExerciseText: { flex: 1, fontWeight: "800", color: colors.text },
  });
};
