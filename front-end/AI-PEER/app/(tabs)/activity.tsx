import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import { usePrefs } from "../../src/prefs-context";
import {
  ExerciseCompletionRecord,
  getExerciseActivityRecords,
  getActiveDays,
} from "../../src/exercise-activity-storage";
import { useAuth } from "../../src/auth/AuthContext";
import { api } from "../../src/api";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";
const PROGRESS_SCALE = 5;

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


export default function ActivityScreen() {
  const { scaled, colors } = usePrefs();
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [records, setRecords] = useState<ExerciseCompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const CATEGORY_META = [
    { key: "warmup", label: t("activity.warmup"), icon: "sunny-outline" as const },
    { key: "strength", label: t("activity.strength"), icon: "barbell-outline" as const },
    { key: "balance", label: t("activity.balance"), icon: "accessibility-outline" as const },
  ];

  
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
    const map = new Map<string, Set<string>>();
    for (const record of repBasedRecords) {
      const date = new Date(record.completedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = toLocalDateKey(date);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(record.exerciseId);
    }
    // Convert sets to counts
    const countMap = new Map<string, number>();
    for (const [key, ids] of map) {
      countMap.set(key, ids.size);
    }
    return countMap;
  }, [repBasedRecords]);

  const weeklyBuckets = useMemo(() => {
    const now = new Date();
    const result: { key: string; label: string; completed: number }[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = toLocalDateKey(date);
      const label = offset === 0 ? "Today" : date.toLocaleDateString(i18n.language, { weekday: "short" });

      result.push({
        key,
        label,
        completed: dayCountMap.get(key) ?? 0,
      });
    }

    return result;
  }, [dayCountMap]);

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayCompleted = dayCountMap.get(todayKey) ?? 0;
  const progressRatio = Math.min(1, todayCompleted / PROGRESS_SCALE);

  const weeklyKeySet = useMemo(
    () => new Set(weeklyBuckets.map((item) => item.key)),
    [weeklyBuckets]
  );

  const categoryTotals = useMemo(() => {
    const idSets = new Map<string, Set<string>>();
    for (const category of CATEGORY_META) idSets.set(category.key, new Set());

    // Use the same 7-day window as the weekly chart for consistent dashboard meaning.
    for (const record of repBasedRecords) {
      const recordDate = new Date(record.completedAt);
      if (Number.isNaN(recordDate.getTime())) continue;
      const dayKey = toLocalDateKey(recordDate);
      if (!weeklyKeySet.has(dayKey)) continue;
      if (!idSets.has(record.category)) continue;
      idSets.get(record.category)!.add(record.exerciseId);
    }

    return CATEGORY_META.map((category) => ({
      ...category,
      completed: idSets.get(category.key)?.size ?? 0,
    }));
  }, [repBasedRecords, weeklyKeySet]);

  const maxCategoryCount = Math.max(
    1,
    ...categoryTotals.map((item) => item.completed)
  );

  // compliance calculations
  const activeDays = useMemo(() => getActiveDays(records), [records]);

  const complianceStats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // active days in last 30
    let daysActive = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      if (activeDays.has(key)) daysActive++;
    }

    // current streak (consecutive days ending today or yesterday)
    let streak = 0;
    const startOffset = activeDays.has(toLocalDateKey(now)) ? 0 : 1;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (activeDays.has(toLocalDateKey(d))) {
        streak++;
      } else {
        break;
      }
    }

    return {
      daysActive,
      rate: Math.round((daysActive / 30) * 100),
      streak,
    };
  }, [activeDays]);

  // calendar heat map data for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = now.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

    const days: { day: number; key: string; active: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, key, active: activeDays.has(key) });
    }

    return { firstDay, daysInMonth, monthLabel, days };
  }, [activeDays]);

  // sync compliance to Firestore
  const lastSyncedRate = useRef<number | null>(null);
  useEffect(() => {
    if (!user?.uid || !token) return;
    if (loading) return;
    if (lastSyncedRate.current === complianceStats.rate) return;
    lastSyncedRate.current = complianceStats.rate;

    api.updateUser(user.uid, {
      compliance_days_active: complianceStats.daysActive,
      compliance_rate: complianceStats.rate,
      compliance_updated_at: new Date().toISOString(),
    }, token).catch((err) => {
      console.error("[Activity] Failed to sync compliance:", err);
    });
  }, [user?.uid, token, loading, complianceStats]);

  const weekdays = useMemo(() => {
    // Generate weekday labels starting from Sunday (S)
    return [...Array(7).keys()].map((i) => {
      const date = new Date(2024, 0, i + 7);
      return date.toLocaleDateString(i18n.language, { weekday: "narrow" });
    });
  }, [i18n.language]);

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
                  <Text style={[styles.headerSubtitle, { fontSize: scaled.h2/2, color: colors.muted }]}>{t("activity.subtitle")}</Text>
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
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{t("activity.todayProgress")}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={warmRed} />
              <Text style={[styles.loadingText, { fontSize: scaled.small }]}>{t("activity.loadingActivity")}</Text>
            </View>
          ) : (
            <>
              <View style={styles.progressStatsRow}>
                <View style={styles.progressStat}>
                  <Text style={[styles.progressValue, { fontSize: scaled.h2 }]}>
                    {todayCompleted}
                  </Text>
                  <Text style={[styles.progressLabel, { fontSize: scaled.small }]}>
                    {t("activity.exercisesCompleted")}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
              </View>
              <Text style={[styles.progressHelper, { fontSize: scaled.h2/2}]}>
                {todayCompleted === 0
                  ? t("activity.noExercisesCompleted")
                  : t("activity.completedToday", { count: todayCompleted })}
              </Text>
            </>
          )}
        </View>

        {/* Exercise Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="grid-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{t("activity.exerciseBreakdown")}</Text>
          </View>
          <Text style={[styles.sectionHint, { fontSize: scaled.h2/2}]}>
            {t("activity.last7Days")}
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

        {/* Monthly Activity */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="calendar-outline" size={16} color={warmRed} />
            <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{t("activity.monthlyActivity")}</Text>
          </View>

          {/* streak stats */}
          <View style={styles.complianceStatsRow}>
            <View style={styles.complianceStat}>
              <Text style={[styles.complianceValue, { fontSize: scaled.h2 }]}>
                {complianceStats.daysActive}
              </Text>
              <Text style={[styles.complianceLabel, { fontSize: scaled.h2/2}]}>
                {t("activity.of30Days")}
              </Text>
            </View>
            <View style={styles.complianceStat}>
              <Text style={[styles.complianceValue, { fontSize: scaled.h2, color: complianceStats.rate >= 70 ? "#1E7A3A" : complianceStats.rate >= 40 ? "#B8860B" : warmRed }]}>
                {complianceStats.rate}%
              </Text>
              <Text style={[styles.complianceLabel, { fontSize: scaled.h2/2}]}>
                {t("activity.activeRate")}
              </Text>
            </View>
            <View style={styles.complianceStat}>
              <Text style={[styles.complianceValue, { fontSize: scaled.h2 }]}>
                {complianceStats.streak}
              </Text>
              <Text style={[styles.complianceLabel, { fontSize: scaled.h2/2}]}>
                {t("activity.dayStreak")}
              </Text>
            </View>
          </View>

          {/* calendar heat map */}
          <Text style={[styles.calendarMonth, { fontSize: scaled.small }]}>
            {calendarData.monthLabel}
          </Text>
          <View style={styles.calendarDayHeaders}>
            {weekdays.map((d, i) => (
              <Text key={i} style={styles.calendarDayHeader}>{d}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {/* empty cells for offset */}
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.calendarCell} />
            ))}
            {calendarData.days.map((d) => (
              <View
                key={d.key}
                style={[
                  styles.calendarCell,
                  d.active ? styles.calendarCellActive : styles.calendarCellInactive,
                  d.key === todayKey && styles.calendarCellToday,
                ]}
              >
                <Text style={[
                  styles.calendarCellText,
                  d.active && styles.calendarCellTextActive,
                ]}>
                  {d.day}
                </Text>
              </View>
            ))}
          </View>
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

  complianceStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  complianceStat: {
    flex: 1,
    backgroundColor: beigeTile,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  complianceValue: { fontWeight: "900", color: "#5B4636" },
  complianceLabel: { marginTop: 4, color: "#7A6659", textAlign: "center", fontWeight: "600" },

  calendarMonth: {
    marginTop: 14,
    fontWeight: "900",
    color: "#3F2F25",
    textAlign: "center",
    marginBottom: 8,
  },
  calendarDayHeaders: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    color: "#7A6659",
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellActive: {
    backgroundColor: "#D4EDDA",
    borderRadius: 8,
  },
  calendarCellInactive: {
    backgroundColor: "#F0E8E0",
    borderRadius: 8,
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: warmRed,
  },
  calendarCellText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A6659",
  },
  calendarCellTextActive: {
    color: "#1E7A3A",
    fontWeight: "900",
  },
});
