import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LineGraph from "../../components/graphs/LineGraph";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

type ActivityTab = "today" | "weekly" | "trends";

export default function ActivityScreen() {
  const [tab, setTab] = useState<ActivityTab>("today");

  const week = [
    { label: "Mon", steps: 4250, ex: 2 },
    { label: "Tue", steps: 3890, ex: 1 },
    { label: "Wed", steps: 4150, ex: 3 },
    { label: "Thu", steps: 3650, ex: 1 },
    { label: "Fri", steps: 4020, ex: 2 },
    { label: "Sat", steps: 2980, ex: 1 },
    { label: "Today", steps: 3247, ex: 1 },
  ];

  const maxSteps = useMemo(
    () => Math.max(...week.map((d) => d.steps), 5000),
    [week]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header (like Figma) */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={styles.brand}>AI PEER</Text>
<<<<<<< HEAD
              <Text style={styles.headerSubtitle}>Fall Risk Assessment</Text>
=======
              <Text style={styles.headerSubtitle}>Activity summaries and insights</Text>
>>>>>>> c802f177aa84764abed56c352fa36fe947070702
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="moon-outline" size={18} color="#555" />
            <Ionicons name="notifications-outline" size={18} color="#555" />
          </View>
        </View>

        {/* Top segmented control: Today | Weekly | Trends */}
        <View style={styles.segmentOuter}>
          <SegmentButton
            label="Today"
            icon="time-outline"
            active={tab === "today"}
            onPress={() => setTab("today")}
          />
          <SegmentButton
            label="Weekly"
            icon="stats-chart-outline"
            active={tab === "weekly"}
            onPress={() => setTab("weekly")}
          />
          <SegmentButton
            label="Trends"
            icon="trending-up-outline"
            active={tab === "trends"}
            onPress={() => setTab("trends")}
          />
        </View>

        {/* Content per tab */}
        {tab === "today" && <TodayView />}
        {tab === "weekly" && <WeeklyView week={week} maxSteps={maxSteps} />}
        {tab === "trends" && <TrendsView />}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------ TODAY VIEW ------------------------ */

function TodayView() {
  return (
    <>
      {/* Today’s Activity */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="pulse-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Today’s Activity</Text>
        </View>

        {/* Grid of tiles like the Figma */}
        <View style={styles.todayGrid}>
          {/* Steps (big tile with bar) */}
          <View style={[styles.todayTileLarge, { marginRight: 8 }]}>
            <Text style={styles.todayValue}>3,272</Text>
            <Text style={styles.todayLabel}>Steps</Text>
            <View style={styles.progressOuter}>
              <View style={[styles.progressInner, { width: "65%" }]} />
            </View>
          </View>

          {/* BPM */}
          <View style={styles.todayTileSmall}>
            <Text style={styles.todayValue}>79</Text>
            <Text style={styles.todayLabel}>BPM</Text>
            <Text style={styles.todaySubStatus}>Normal</Text>
          </View>
        </View>

        <View style={styles.todayGrid}>
          {/* CHANGED: Calories -> Activities Done */}
          <View style={[styles.todayTileSmall, { marginRight: 8 }]}>
            <Text style={styles.todayValue}>4</Text>
            <Text style={styles.todayLabel}>Activities Done</Text>
            <Text style={styles.todaySubText}>Goal: 5</Text>
          </View>

          {/* Sleep */}
          <View style={styles.todayTileSmall}>
            <Text style={styles.todayValue}>7.2h</Text>
            <Text style={styles.todayLabel}>Sleep</Text>
            <Text style={styles.todaySubStatus}>Good</Text>
          </View>
        </View>
      </View>

      {/* Movement Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Movement Timeline</Text>

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: "#F6B800" }]} />
          <Text style={styles.timelineText}>Walking detected - 0m ago</Text>
        </View>

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: warmRed }]} />
          <Text style={styles.timelineText}>Exercise session - 45 minutes ago</Text>
        </View>

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: "#4B3A30" }]} />
          <Text style={styles.timelineText}>Resting period - 2 hours ago</Text>
        </View>
      </View>
    </>
  );
}

/* ------------------------ WEEKLY VIEW ------------------------ */

function WeeklyView({
  week,
  maxSteps,
}: {
  week: { label: string; steps: number; ex: number }[];
  maxSteps: number;
}) {
  // CHANGED: weekly chart should show activities (ex), not steps
  const lineData = useMemo(
    () => week.map((d) => ({ label: d.label, value: d.ex })),
    [week]
  );

  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="stats-chart-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Weekly Summary</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <LineGraph data={lineData} height={120} />
        </View>

        {/* keep this so your UI still shows steps/ex text below (minimal layout disruption) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingVertical: 10 }}
        >
          {week.map((d) => {
            const h = Math.max(18, Math.round((d.steps / maxSteps) * 80));
            return (
              <View key={d.label} style={styles.weekBlock}>
                <View style={styles.weekCard}>
                  <View style={[styles.weekBar, { height: h }]} />
                </View>
                <Text style={styles.weekSteps}>{d.steps}</Text>
                <Text style={styles.weekEx}>{d.ex} activities</Text>
                <Text style={styles.weekLabel}>{d.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

/* ------------------------ TRENDS VIEW ------------------------ */

function TrendsView() {
  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="trending-up-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Activity Trends</Text>
        </View>

        {/* Steps */}
        <View style={styles.trendRow}>
          <View style={styles.trendLeft}>
            <Ionicons name="walk-outline" size={18} color="#5B4636" />
            <Text style={styles.trendLabel}>Steps</Text>
          </View>
          <Text style={styles.trendDeltaPositive}>+12% this week</Text>
        </View>

        {/* Heart rate (pink row) */}
        <View style={[styles.trendRow, styles.trendRowHeart]}>
          <View style={styles.trendLeft}>
            <Ionicons name="heart-outline" size={18} color={warmRed} />
            <Text style={styles.trendLabel}>Heart Rate</Text>
          </View>
          <Text style={styles.trendStatus}>Stable</Text>
        </View>

        {/* Sleep quality */}
        <View style={styles.trendRow}>
          <View style={styles.trendLeft}>
            <Ionicons name="bed-outline" size={18} color="#5B4636" />
            <Text style={styles.trendLabel}>Sleep Quality</Text>
          </View>
          <Text style={styles.trendDeltaNegative}>-5% this week</Text>
        </View>
      </View>
    </>
  );
}

/* ------------------------ SMALL COMPONENTS ------------------------ */

function SegmentButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.segmentBtn,
        active && { backgroundColor: warmRed },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? "#FFF" : "#7A6659"}
      />
      <Text
        style={[
          styles.segmentText,
          active && { color: "#FFF" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------------------ STYLES ------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
<<<<<<< HEAD
  brand: { fontSize: 16, fontWeight: "800", color: "#3F2F25" },
  headerSubtitle: { fontSize: 11, color: "#7A6659" },

  segmentOuter: {
    marginTop: 8,
=======
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#3F2F25" },
  headerSubtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: "#7A6659" },

  segmentOuter: {
>>>>>>> c802f177aa84764abed56c352fa36fe947070702
    backgroundColor: "#F4E3D6",
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A6659",
  },

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
  cardTitle: { fontWeight: "800", fontSize: 14, color: "#3F2F25" },

  /* Today view */
  todayGrid: {
    flexDirection: "row",
    marginTop: 14,
  },
  todayTileLarge: {
    flex: 2,
    backgroundColor: beigeTile,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  todayTileSmall: {
    flex: 1,
    backgroundColor: beigeTile,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  todayValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#5B4636",
  },
  todayLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#7A6659",
  },
  todaySubStatus: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#D26C57",
  },
  todaySubText: {
    marginTop: 6,
    fontSize: 12,
    color: "#7A6659",
  },
  progressOuter: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F9D8C8",
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    backgroundColor: warmRed,
    borderRadius: 999,
  },

  /* Timeline */
  timelineItem: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  timelineText: {
    fontSize: 13,
    color: "#3F2F25",
  },

  /* Weekly view (kept) */
  weekBlock: { width: 80, alignItems: "center" },
  weekCard: {
    width: "100%",
    height: 90,
    backgroundColor: beigeTile,
    borderRadius: 10,
    padding: 6,
    justifyContent: "flex-end",
  },
  weekBar: { width: "100%", borderRadius: 8, backgroundColor: warmRed },
  weekSteps: { marginTop: 8, fontSize: 12, color: "#5B4636" },
  weekEx: { fontSize: 11, color: "#7A6659" },
  weekLabel: { marginTop: 2, fontSize: 12, color: "#5B4636" },

  /* Trends view */
  trendRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: beigeTile,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendRowHeart: { backgroundColor: "#FAD9D6" },
  trendLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  trendLabel: { fontSize: 13, fontWeight: "700", color: "#5B4636" },
  trendDeltaPositive: { fontSize: 12, fontWeight: "700", color: "#2E7D32" },
  trendDeltaNegative: { fontSize: 12, fontWeight: "700", color: "#C62828" },
  trendStatus: { fontSize: 12, fontWeight: "700", color: "#C75B5B" },
});

