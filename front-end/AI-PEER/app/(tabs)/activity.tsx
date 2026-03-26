import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import LineGraph from "../../components/graphs/LineGraph";
import { usePrefs } from "../../src/prefs-context";
import {
  ExerciseCompletionRecord,
  getExerciseActivityRecords,
} from "../../src/exercise-activity-storage";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";
const PROGRESS_SCALE = 5;

const CATEGORY_META = [
  { key: "warmup", label: "Warm Up", icon: "sunny-outline" as const },
  { key: "strength", label: "Strength", icon: "barbell-outline" as const },
  { key: "balance", label: "Balance", icon: "accessibility-outline" as const },
];

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function relativeTimeFromNow(isoDate: string): string {
  const parsed = new Date(isoDate);
  const time = parsed.getTime();
  if (Number.isNaN(time)) return "Unknown time";

  const deltaMs = Date.now() - time;
  const deltaMinutes = Math.floor(deltaMs / 60000);
  if (deltaMinutes <= 0) return "Just now";
  if (deltaMinutes < 60) return `${deltaMinutes} min ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} hour${deltaHours === 1 ? "" : "s"} ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} day${deltaDays === 1 ? "" : "s"} ago`;
}

export default function ActivityScreen() {
  const { scaled, colors } = usePrefs();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [records, setRecords] = useState<ExerciseCompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        try {
          const saved = await getExerciseActivityRecords();
          if (isMounted) setRecords(saved);
        } finally {
          if (isMounted) setLoading(false);
        }
      })();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [records]
  );

  const repBasedRecords = useMemo(
    () => sortedRecords.filter((record) => record.repCount > 0),
    [sortedRecords]
  );

  const dayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of repBasedRecords) {
      const date = new Date(record.completedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = toLocalDateKey(date);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [repBasedRecords]);

  const weeklyBuckets = useMemo(() => {
    const now = new Date();
    const result: { key: string; label: string; completed: number }[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = toLocalDateKey(date);
      const label = offset === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });

      result.push({
        key,
        label,
        completed: dayCountMap.get(key) ?? 0,
      });
    }

    return result;
  }, [dayCountMap]);

  const weeklyGraphData = useMemo(
    () => weeklyBuckets.map((d) => ({ label: d.label, value: d.completed })),
    [weeklyBuckets]
  );

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayCompleted = dayCountMap.get(todayKey) ?? 0;
  const progressRatio = Math.min(1, todayCompleted / PROGRESS_SCALE);

  const weeklyKeySet = useMemo(
    () => new Set(weeklyBuckets.map((item) => item.key)),
    [weeklyBuckets]
  );

  const categoryTotals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of CATEGORY_META) counts.set(category.key, 0);

    // Use the same 7-day window as the weekly chart for consistent dashboard meaning.
    for (const record of repBasedRecords) {
      const recordDate = new Date(record.completedAt);
      if (Number.isNaN(recordDate.getTime())) continue;
      const dayKey = toLocalDateKey(recordDate);
      if (!weeklyKeySet.has(dayKey)) continue;
      if (!counts.has(record.category)) continue;
      counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
    }

    return CATEGORY_META.map((category) => ({
      ...category,
      completed: counts.get(category.key) ?? 0,
    }));
  }, [repBasedRecords, weeklyKeySet]);

  const maxCategoryCount = Math.max(
    1,
    ...categoryTotals.map((item) => item.completed)
  );

  const recentCompleted = useMemo(
    () => repBasedRecords.slice(0, 3),
    [repBasedRecords]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background || beige }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: tabBarHeight + insets.bottom + 28 },
        ]}
        scrollIndicatorInsets={{ bottom: tabBarHeight + insets.bottom + 28 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.headerSubtitle, { fontSize: scaled.h2 / 2 }]}>
                Exercise tracking and progress summary
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="moon-outline" size={18} color="#555" />
            <Ionicons name="notifications-outline" size={18} color="#555" />
          </View>
        </View>

        {/* Today's Progress */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="checkmark-done-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Today&apos;s Progress</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={warmRed} />
              <Text style={[styles.loadingText, { fontSize: scaled.small }]}>Loading activity...</Text>
            </View>
          ) : (
            <>
              <View style={styles.progressStatsRow}>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressValue, { fontSize: scaled.h2 }]}>
                    {todayCompleted}
                  </Text>
                  <Text style={[styles.progressLabel, { fontSize: scaled.small }]}>
                    Exercises Completed
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
              </View>
              <Text style={[styles.progressHelper, { fontSize: scaled.h2 / 2 }]}>
                {todayCompleted === 0
                  ? "No exercises completed yet today"
                  : `${todayCompleted} completed today`}
              </Text>
            </>
          )}
        </View>

        {/* Exercise Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="grid-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Exercise Breakdown</Text>
          </View>
          <Text style={[styles.sectionHint, { fontSize: scaled.h2 / 2 }]}>
            Last 7 days
          </Text>

          {categoryTotals.map((item) => (
            <View key={item.key} style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Ionicons name={item.icon} size={16} color="#5B4636" />
                <Text style={[styles.breakdownLabel, { fontSize: scaled.small }]}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.breakdownRight}>
                <View style={styles.breakdownTrack}>
                  <View
                    style={[
                      styles.breakdownFill,
                      { width: `${(item.completed / maxCategoryCount) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.breakdownCount, { fontSize: scaled.small }]}>
                  {item.completed}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Weekly Activity */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="stats-chart-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Weekly Activity</Text>
          </View>
          <Text style={[styles.sectionHint, { fontSize: scaled.h2 / 2 }]}>
            Exercises completed each day
          </Text>
          <View style={styles.weeklyGraphWrap}>
            <LineGraph data={weeklyGraphData} height={130} />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Recent Activity</Text>
          </View>

          {recentCompleted.length === 0 ? (
            <Text style={[styles.emptyRecentText, { fontSize: scaled.small }]}>
              No completed exercises yet.
            </Text>
          ) : (
            recentCompleted.map((item) => (
              <View key={item.id} style={styles.recentRow}>
                <View style={styles.recentIconWrap}>
                  <Ionicons
                    name={
                      item.category === "warmup"
                        ? "sunny-outline"
                        : item.category === "strength"
                          ? "barbell-outline"
                          : item.category === "balance"
                            ? "accessibility-outline"
                            : "fitness-outline"
                    }
                    size={16}
                    color="#5B4636"
                  />
                </View>
                <View style={styles.recentTextWrap}>
                  <Text style={[styles.recentTitle, { fontSize: scaled.small }]}>
                    Completed &quot;{item.exerciseName}&quot;
                  </Text>
                  <Text style={[styles.recentMeta, { fontSize: scaled.h2 / 2 }]}>
                    {item.repCount} reps - {relativeTimeFromNow(item.completedAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, gap: 14 },

  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#3F2F25" },
  headerSubtitle: { marginTop: 3, marginBottom: 6, color: "#7A6659" },

  card: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontWeight: "800", fontSize: 14, color: "#3F2F25" },
  sectionHint: { marginTop: 6, color: "#7A6659", fontWeight: "600" },

  loadingWrap: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: "#7A6659", fontWeight: "700" },

  progressStatsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  progressStat: {
    flex: 1,
    backgroundColor: beigeTile,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  progressValue: { fontWeight: "900", color: "#5B4636" },
  progressLabel: { marginTop: 4, color: "#7A6659", textAlign: "center" },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F9D8C8",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: warmRed,
  },
  progressHelper: { marginTop: 8, color: "#7A6659", fontWeight: "700" },

  breakdownRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  breakdownLabel: { color: "#5B4636", fontWeight: "700" },
  breakdownRight: { flexDirection: "row", alignItems: "center", gap: 8, width: 150 },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: beigeTile,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: warmRed,
  },
  breakdownCount: { width: 20, textAlign: "right", color: "#5B4636", fontWeight: "800" },

  weeklyGraphWrap: { marginTop: 12 },

  recentRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: beigeTile,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  recentIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7E8DA",
  },
  recentTextWrap: { flex: 1 },
  recentTitle: { color: "#3F2F25", fontWeight: "700" },
  recentMeta: { marginTop: 2, color: "#7A6659", fontWeight: "600" },
  emptyRecentText: { marginTop: 10, color: "#7A6659", fontWeight: "600" },
});
