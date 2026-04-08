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

type Test = {
  id: string; // assessment-1/-2/-3 — used as the video ID
  name: string;
  shortDesc: string;
  purpose: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  videoLabel: string; // shown on the video-confirm preview screen
  nextRoute: string; // session screen route after preview
};

const TESTS: Test[] = [
  {
    id: "assessment-1",
    name: "Chair Rise",
    shortDesc:
      "Stand up and sit down as many times as possible in 30 seconds, with your arms crossed over your chest.",
    purpose:
      "Measures lower-body strength and endurance — a key fall-risk indicator.",
    icon: "barbell-outline",
    iconBg: "#F0E9FF",
    videoLabel: "Chair Rise (30-Second Sit-to-Stand)",
    nextRoute: "/(tabs)/chair-rise-test",
  },
  {
    id: "assessment-3",
    name: "Timed Up and Go",
    shortDesc:
      "Stand up from a chair, walk to a marker, turn around, walk back, and sit down — as quickly as you safely can.",
    purpose:
      "Measures functional mobility — completing in 12 seconds or less is considered normal.",
    icon: "walk-outline",
    iconBg: "#E8F0FF",
    videoLabel: "Timed Up and Go (TUG)",
    nextRoute: "/(tabs)/tug-test",
  },
  {
    id: "assessment-2",
    name: "4-Stage Balance Test",
    shortDesc:
      "Hold four progressively harder standing positions for 10 seconds each: feet together, semi-tandem, tandem, and single-leg.",
    purpose:
      "The standard CDC fall-risk screening for static balance.",
    icon: "accessibility-outline",
    iconBg: "#FFE9DA",
    videoLabel: "4-Stage Balance Test",
    nextRoute: "/(tabs)/balance-stages-test",
  },
];

export default function BalanceTestPage() {
  const router = useRouter();

  const startTest = (test: Test) => {
    router.push({
      pathname: "/(tabs)/video-confirm",
      params: {
        cat: "assessment",
        video: test.id,
        label: test.videoLabel,
        nextRoute: test.nextRoute,
        backRoute: "/(tabs)/balance-test",
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
        <Text style={styles.subtitle}>Balance Test</Text>

        {/* Segmented control */}
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
            <Ionicons name="pulse-outline" size={14} color="#FFF" />
            <Text style={[styles.segmentText, styles.segmentTextActive]}>
              Balance Test
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center heading */}
        <View style={styles.centerHead}>
          <Text style={styles.centerTitle}>Fall-Risk Assessments</Text>
          <Text style={styles.centerSub}>
            Three clinical tests to assess your balance and mobility
          </Text>
        </View>

        {/* Test cards */}
        <View style={{ gap: 14 }}>
          {TESTS.map((test) => (
            <View key={test.id} style={styles.testCard}>
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: test.iconBg },
                  ]}
                >
                  <Ionicons name={test.icon} size={20} color="#8A5A3C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testTitle}>{test.name}</Text>
                </View>
              </View>

              <Text style={styles.testDesc}>{test.shortDesc}</Text>

              <View style={styles.purposeStrip}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#3D2F27"
                />
                <Text style={styles.purposeText}>{test.purpose}</Text>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.9}
                onPress={() => startTest(test)}
              >
                <Ionicons name="play" size={16} color="#FFF" />
                <Text style={styles.startBtnText}>Start Test</Text>
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
  centerTitle: { fontSize: 18, fontWeight: "900", color: "#222" },
  centerSub: {
    marginTop: 4,
    color: "#6B5E55",
    fontWeight: "600",
    textAlign: "center",
  },

  testCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },

  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  testTitle: { fontSize: 17, fontWeight: "900", color: "#222" },

  testDesc: {
    marginTop: 12,
    color: "#3D2F27",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 20,
  },

  purposeStrip: {
    marginTop: 12,
    backgroundColor: beigeStrip,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purposeText: {
    flex: 1,
    color: "#3D2F27",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
  },

  startBtn: {
    marginTop: 14,
    backgroundColor: warmRed,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  startBtnText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
});
