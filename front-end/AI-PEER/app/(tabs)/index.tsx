import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import FRAMatrixGraph from "../../components/graphs/FRAMatrixGraph";
import LineGraph from "../../components/graphs/LineGraph";

export default function Home() {
  // demo data to match your mock
  const router = useRouter();
  const [riskPercent] = useState(85);
  const riskLevel = "Low Risk";

  // CHANGED: weekly activity should represent "activities done", not steps taken
  const week = [
    { label: "Mon", activities: 2 },
    { label: "Tue", activities: 1 },
    { label: "Wed", activities: 3 },
    { label: "Thu", activities: 1 },
    { label: "Fri", activities: 2 },
    { label: "Sat", activities: 1 },
    { label: "Today", activities: 1 },
  ];

  const lineData = useMemo(
    () => week.map((d) => ({ label: d.label, value: d.activities })),
    [week]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={styles.brand}>AI PEER</Text>
              <Text style={styles.subtitle}>Fall Risk Assessment</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="moon-outline" size={18} color="#555" />
            <Ionicons name="notifications-outline" size={18} color="#555" />
          </View>
        </View>
        

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

        {/* Today’s Risk Score (CHANGED to FRA matrix graph) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s Risk Score</Text>

          {/* keep your % display (still useful), but add FRA matrix per PM */}
          <View style={styles.scoreWrap}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#3BAA56" />
            <Text style={styles.scorePct}>{riskPercent}%</Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <FRAMatrixGraph riskPercent={riskPercent} caption="FRA Risk Matrix" />
          </View>

          <Text style={styles.scoreCaption}>{riskLevel}</Text>
        </View>

        {/* Action Row 1: Balance Test | Assessment */}
        <View style={styles.rowTwo}>
          <PillButton icon="pulse-outline" label="Balance Test" onPress={() => {}} />
          <PillButton icon="clipboard-outline" label="Questionnaire" onPress={() => {router.push("/questionnaire")}} />
        </View>

        {/* Action Row 2: Exercise Mode (full width) */}
        <View style={styles.rowOne}>
          <PillButton icon="heart-outline" label="Exercise Mode" onPress={() => {}} full />
        </View>

        {/* Action Row 3: Let’s Chat (full width) */}
        <View style={styles.rowOne}>
          <PillButton icon="chatbubble-ellipses-outline" label="Let’s Chat" onPress={() => {}} full />
        </View>

        {/* Weekly Activity Summary (CHANGED to line graph of activities) */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="pulse-outline" size={16} />
            <Text style={styles.cardTitle}>Weekly Activity Summary</Text>
          </View>

          <LineGraph data={lineData} height={120} />
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
    justifyContent: "space-between",
  },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: "#6B5E55" },

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

  scoreWrap: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  scorePct: { fontSize: 32, fontWeight: "900", color: "#38A169" },
  scoreCaption: { marginTop: 10, textAlign: "center", color: "#2E7D32", fontWeight: "700" },

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
});

