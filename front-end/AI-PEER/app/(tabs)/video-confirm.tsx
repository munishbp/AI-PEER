import React, { useMemo } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

type CatKey = "warmup" | "strength" | "balance";

function prettyCat(cat?: string) {
  if (cat === "warmup") return "Warm-Up";
  if (cat === "strength") return "Strength";
  if (cat === "balance") return "Balance";
  return "Exercise";
}

export default function VideoConfirmPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    cat?: CatKey;
    video?: string;
    label?: string;
    duration?: string;
  }>();

  const catTitle = useMemo(() => prettyCat(params.cat), [params.cat]);

  const exerciseLabel = params.label ?? "Video placeholder";
  const duration = params.duration ?? "—";

  const onConfirm = () => {
    // ✅ Pass the selected exercise info forward so Vision/Monitoring knows exactly what to track
    router.push({
      pathname: "/(tabs)/exercise-session",
      params: {
        cat: params.cat,
        video: params.video,
        label: exerciseLabel,
        duration,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={18} color="#3D2F27" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />
          <Ionicons name="shield-checkmark-outline" size={18} color="#2E5AAC" />
        </View>

        <Text style={styles.pageTitle}>Confirm Video</Text>
        <Text style={styles.pageSub}>
          This confirmation step ensures the Vision model knows exactly which
          exercise you’re performing.
        </Text>

        {/* Video preview placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Exercise</Text>

          <View style={styles.previewBox}>
            <Ionicons name="play-circle-outline" size={44} color="#8C7A6C" />
            <Text style={styles.previewTitle}>{exerciseLabel}</Text>
            <Text style={styles.previewMeta}>
              {catTitle} • {duration}
            </Text>
            <Text style={styles.previewHint}>
              Video player will be connected when backend/media is ready.
            </Text>
          </View>

          <View style={styles.infoRow}>
            <InfoPill label="Category" value={catTitle} />
            <InfoPill label="Duration" value={duration} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.9}
            onPress={() => router.back()}
          >
            <Ionicons name="refresh-outline" size={16} color="#5B4636" />
            <Text style={styles.secondaryText}>Choose Different</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={onConfirm}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={styles.primaryText}>Start Monitoring</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

const beige = "#F7EDE4";
const beigeStrip = "#F3E7D9";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backText: { fontWeight: "900", color: "#3D2F27" },

  pageTitle: { fontSize: 18, fontWeight: "900", color: "#222", marginTop: 4 },
  pageSub: { color: "#6B5E55", fontWeight: "600" },

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
  cardTitle: { fontWeight: "900", color: "#222" },

  previewBox: {
    marginTop: 10,
    height: 220,
    borderRadius: 12,
    backgroundColor: "#FFF7F1",
    borderWidth: 1,
    borderColor: "#F0E0D4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  previewTitle: { marginTop: 10, fontWeight: "900", fontSize: 16, color: "#222" },
  previewMeta: { marginTop: 4, fontWeight: "800", color: "#6B5E55" },
  previewHint: {
    marginTop: 10,
    color: "#8C7A6C",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  infoRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    backgroundColor: beigeStrip,
    borderRadius: 12,
    padding: 12,
  },
  pillLabel: { fontSize: 11, fontWeight: "900", color: "#3D2F27" },
  pillValue: { marginTop: 4, fontWeight: "900", color: "#222" },

  controlsRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#E6D4C6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { fontWeight: "900", color: "#5B4636" },

  primaryBtn: {
    flex: 1.2,
    backgroundColor: warmRed,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { fontWeight: "900", color: "#FFF" },
});
