import { useMemo, useState } from "react";
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
import { scaleFontSizes } from "../../src/theme";
import { usePrefs } from "../../src/prefs-context";
import FRAMatrixCard from "../../components/FRAMatrixCard";
import LineGraph from "../../components/graphs/LineGraph";

export default function Home() {
  const router = useRouter();

  // status label derived from your FRA result
  // (keep your real logic here if you already have it elsewhere)
  const riskLevel = "Low Risk";
  const { scaled, colors } = usePrefs();

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
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2/2 }]}>Fall Risk Assessment</Text>
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
            <Text style={[styles.segmentText, styles.segmentTextActive, { fontSize: scaled.base }]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/exercise")}
          >
            <Ionicons name="barbell-outline" size={14} />
            <Text style={[styles.segmentText, { fontSize: scaled.base }]}>Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* FRA Matrix card */}
        <View style={styles.card}>
          {/* ✅ Replace old title with "FRA Matrix" */}
          <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>FRA Matrix</Text>

          <FRAMatrixCard />
        </View>

        {/* Action Row 1 */}
        <View style={styles.rowTwo}>
          <PillButton icon="pulse-outline" label="Balance Test" onPress={() => {} } scaled={scaled} />
          <PillButton icon="clipboard-outline" label="Questionnaire" onPress={() => {router.push("/questionnaire")}} scaled={scaled} />
        </View>

        {/* Action Row 2: Exercise Mode (full width) */}
        <View style={styles.rowOne}>
          <PillButton icon="heart-outline" label="Exercise Mode" onPress={() => {}} full scaled={scaled} />
        </View>

        {/* Let’s Chat */}
        <View style={styles.rowOne}>
          <PillButton
            icon="chatbubble-ellipses-outline"
            label="Let’s Chat"
            onPress={() => router.push("/(tabs)/ai-chat")}
            full
            scaled={scaled}
          />
        </View>

        {/* Weekly Activity Summary */}
        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <Ionicons name="pulse-outline" size={16} />
            <Text style={[styles.cardTitle, { fontSize: scaled.h3 }]}>Weekly Activity Summary</Text>
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
  scaled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  full?: boolean;
  scaled: ReturnType<typeof scaleFontSizes>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.pill, full && { flex: 1 }]}
    >
      <Ionicons name={icon} size={16} color="#5B4636" />
      <Text style={[styles.pillText, { fontSize: scaled.h1/2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const beige = "#F7EDE4";
const beigeDark = "#E6D4C6";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 3, marginBottom: 6, color: "#6B5E55" },

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
  segmentActive: { backgroundColor: warmRed },
  segmentText: { fontWeight: "700", color: "#7A6659" },
  segmentTextActive: { color: "#FFF" },

  card: {
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
  cardTitle: { fontWeight: "800", fontSize: 14 },

  scoreCaption: {
    textAlign: "center",
    color: "#2E7D32",
    fontWeight: "700",
  },

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
