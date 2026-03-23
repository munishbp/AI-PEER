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

type TestKey = "static" | "dynamic" | "functional";

type BalanceTestGroup = {
  key: TestKey;
  title: string;
  subtitle: string;
  purpose: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  videos: string[];
};

const TEST_GROUPS: BalanceTestGroup[] = [
  {
    key: "static",
    title: "Static Balance",
    subtitle: "Tests while standing still",
    purpose: "Screens postural stability during quiet stance",
    icon: "accessibility-outline",
    iconBg: "#FFE9DA",
    videos: [
      "Demo: Feet Together Stand (Coming Soon)",
      "Demo: Tandem Stand (Coming Soon)",
    ],
  },
  {
    key: "dynamic",
    title: "Dynamic Balance",
    subtitle: "Tests while moving",
    purpose: "Assesses control while stepping and changing direction",
    icon: "walk-outline",
    iconBg: "#E8F0FF",
    videos: [
      "Demo: Timed Up And Go (Coming Soon)",
      "Demo: Walk-And-Turn (Coming Soon)",
    ],
  },
  {
    key: "functional",
    title: "Functional Strength",
    subtitle: "Balance-related functional tasks",
    purpose: "Measures sit-to-stand and lower-extremity control",
    icon: "barbell-outline",
    iconBg: "#F0E9FF",
    videos: ["Demo: Chair Rise Test (Coming Soon)"],
  },
];

export default function BalanceTestPage() {
  const router = useRouter();

  const [openFolders, setOpenFolders] = useState<Record<TestKey, boolean>>({
    static: true,
    dynamic: false,
    functional: false,
  });

  const toggleFolder = (key: TestKey) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
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
            <Ionicons name="pulse-outline" size={14} color="#FFF" />
            <Text style={[styles.segmentText, styles.segmentTextActive]}>
              Balance Test
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center heading */}
        <View style={styles.centerHead}>
          <Text style={styles.centerTitle}>Balance Test Demos</Text>
          <Text style={styles.centerSub}>
            Placeholder videos for future test demonstrations
          </Text>
        </View>

        {/* Test cards */}
        <View style={{ gap: 18 }}>
          {TEST_GROUPS.map((group) => {
            const isOpen = openFolders[group.key];

            return (
              <View key={group.key} style={styles.testCard}>
                <View style={styles.topRow}>
                  <View style={[styles.iconCircle, { backgroundColor: group.iconBg }]}>
                    <Ionicons name={group.icon} size={18} color="#8A5A3C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testTitle}>{group.title}</Text>
                    <Text style={styles.testSubtitle}>{group.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.infoStrip}>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Purpose:</Text> {group.purpose}
                  </Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => toggleFolder(group.key)}
                    style={styles.folderTab}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons
                        name="folder-open-outline"
                        size={18}
                        color="#3D2F27"
                      />
                      <Text style={styles.folderTitle}>Demo Videos</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{group.videos.length}</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isOpen ? "chevron-up-outline" : "chevron-down-outline"}
                      size={18}
                      color="#6B5E55"
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.videoList}>
                      {group.videos.map((name) => (
                        <View key={name} style={styles.videoRow}>
                          <View style={styles.videoPlaceholderIcon}>
                            <Ionicons
                              name="videocam-outline"
                              size={24}
                              color="#8C7A6C"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.videoName}>{name}</Text>
                            <Text style={styles.videoMeta}>Not available yet</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.comingSoonBtn}>
                  <Ionicons name="time-outline" size={16} color="#8C7A6C" />
                  <Text style={styles.comingSoonText}>Test Module Coming Soon</Text>
                </View>
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
  centerSub: { marginTop: 4, color: "#6B5E55", fontWeight: "600", textAlign: "center" },

  testCard: {
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

  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  testTitle: { fontSize: 14, fontWeight: "900", color: "#222" },
  testSubtitle: { marginTop: 2, color: "#6B5E55", fontWeight: "600" },

  infoStrip: {
    marginTop: 14,
    backgroundColor: beigeStrip,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoText: { color: "#3D2F27", fontWeight: "600" },
  infoLabel: { fontWeight: "900" },

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

  comingSoonBtn: {
    marginTop: 12,
    backgroundColor: "#F5F0EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EADFD5",
  },
  comingSoonText: { color: "#6B5E55", fontWeight: "800" },
});
