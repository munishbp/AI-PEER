import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {
  // demo data to match your mock
  const [riskPercent] = useState(85);
  const riskLevel = "Low Risk"; // string shown under %
  const week = [
    { label: "Mon", steps: 4250 },
    { label: "Tue", steps: 3890 },
    { label: "Wed", steps: 4150 },
    { label: "Thu", steps: 3650 },
    { label: "Fri", steps: 4020 },
    { label: "Sat", steps: 2980 },
    { label: "Today", steps: 3247 },
  ];
  const maxSteps = useMemo(() => Math.max(...week.map(w => w.steps), 5000), [week]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <Text style={styles.brand}>AI PEER</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="moon-outline" size={18} color="#555" />
          <Ionicons name="notifications-outline" size={18} color="#555" style={{ marginLeft: 12 }} />
        </View>
        <Text style={styles.subtitle}>Fall Risk Assessment</Text>

        {/* Segmented (Overview | Exercise) */}
        <View style={styles.segmentOuter}>
          <TouchableOpacity style={[styles.segmentBtn, styles.segmentActive]}>
            <Ionicons name="home-outline" size={14} />
            <Text style={[styles.segmentText, styles.segmentTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.segmentBtn} disabled>
            <Ionicons name="barbell-outline" size={14} />
            <Text style={styles.segmentText}>Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Today’s Risk Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s Risk Score</Text>
          <View style={styles.scoreWrap}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#3BAA56" />
            <Text style={styles.scorePct}>{riskPercent}%</Text>
          </View>
          <Text style={styles.scoreCaption}>Low Risk</Text>
        </View>

        {/* Action Row 1: Balance Test | Assessment */}
        <View style={styles.rowTwo}>
          <PillButton icon="pulse-outline" label="Balance Test" onPress={() => {}} />
          <PillButton icon="clipboard-outline" label="Assessment" onPress={() => {}} />
        </View>

        {/* Action Row 2: Exercise Mode (full width) */}
        <View style={styles.rowOne}>
          <PillButton icon="heart-outline" label="Exercise Mode" onPress={() => {}} full />
        </View>

        {/* Action Row 3: Let’s Chat (full width) */}
        <View style={styles.rowOne}>
          <PillButton icon="chatbubble-ellipses-outline" label="Let’s Chat" onPress={() => {}} full />
        </View>

        {/* Weekly Activity Summary */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="pulse-outline" size={16} />
            <Text style={styles.cardTitle}>Weekly Activity Summary</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingVertical: 6 }}
          >
            {week.map((d) => {
              const h = Math.max(16, Math.round((d.steps / maxSteps) * 90)); // bar height
              return (
                <View key={d.label} style={styles.barBlock}>
                  <View style={styles.barOuter}>
                    <View style={[styles.barInner, { height: h }]} />
                  </View>
                  <Text style={styles.barSteps}>{d.steps}</Text>
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PillButton({
  icon,
  label,
  onPress,
  full,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  full?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.pill, full && { flex: 1 }]}>
      <Ionicons name={icon} size={16} color="#5B4636" />
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const beige = "#F7EDE4";
const beigeDark = "#E6D4C6";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },

  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 4, marginBottom: 6, color: "#6B5E55" },

  segmentOuter: {
    backgroundColor: "#F4E3D6",
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
  segmentActive: {
    backgroundColor: warmRed,
  },
  segmentText: { fontWeight: "700", color: "#7A6659" },
  segmentTextActive: { color: "#FFF" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "800", fontSize: 14 },

  scoreWrap: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  scorePct: { fontSize: 36, fontWeight: "900", color: "#38A169" },
  scoreCaption: { marginTop: 4, textAlign: "center", color: "#2E7D32", fontWeight: "700" },

  rowTwo: { flexDirection: "row", gap: 10 },
  rowOne: { flexDirection: "row" },

  pill: {
    flex: 1,
    backgroundColor: beigeDark,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  pillText: { fontWeight: "800", color: "#5B4636" },

  barBlock: { width: 86, alignItems: "center" },
  barOuter: {
    width: "100%",
    height: 90,
    backgroundColor: "#F4D9CD",
    borderRadius: 10,
    padding: 6,
    justifyContent: "flex-end",
  },
  barInner: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: warmRed,
  },
  barSteps: { marginTop: 8, fontSize: 12, color: "#5B4636" },
  barLabel: { marginTop: 2, fontSize: 12, color: "#5B4636" },
});
