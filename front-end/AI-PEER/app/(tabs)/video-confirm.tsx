import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import { fetchVideoUrl, VideoResponse } from "@/src/video";
import { useAuth } from "@/src/auth/AuthContext";

type CatKey = "warmup" | "strength" | "balance";

function prettyCat(cat?: string) {
  if (cat === "warmup") return "Warm-Up";
  if (cat === "strength") return "Strength";
  if (cat === "balance") return "Balance";
  return "Exercise";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoConfirmPage() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    cat?: CatKey;
    video?: string;
    label?: string;
  }>();

  const catTitle = useMemo(() => prettyCat(params.cat), [params.cat]);
  const exerciseLabel = params.label ?? "Exercise";

  const [videoData, setVideoData] = useState<VideoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!params.video) {
      setLoading(false);
      setError("No exercise selected");
      return;
    }
    if (!token) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVideoUrl(params.video, token)
      .then((data) => {
        if (!cancelled) {
          setVideoData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load video");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.video, token, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const duration = videoData
    ? formatDuration(videoData.duration)
    : "\u2014";

  const onConfirm = () => {
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
            onPress={() => router.replace("/(tabs)/exercise")}
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
          exercise you are performing.
        </Text>

        {/* Video preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Exercise</Text>

          <View style={styles.videoBox}>
            {loading ? (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator size="large" color={warmRed} />
                <Text style={styles.placeholderText}>Loading video...</Text>
              </View>
            ) : error ? (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="alert-circle-outline" size={44} color={warmRed} />
                <Text style={styles.placeholderTitle}>{exerciseLabel}</Text>
                <Text style={[styles.placeholderText, { color: warmRed }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  activeOpacity={0.85}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFF" />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : videoData ? (
              <Video
                source={{ uri: videoData.videoUrl }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                style={styles.video}
              />
            ) : null}
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
            onPress={() => router.replace("/(tabs)/exercise")}
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

  videoBox: {
    marginTop: 10,
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "#FFF7F1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  placeholderTitle: { fontWeight: "900", fontSize: 16, color: "#222" },
  placeholderText: {
    color: "#8C7A6C",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  retryBtn: {
    marginTop: 4,
    backgroundColor: warmRed,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  retryText: { fontWeight: "900", color: "#FFF" },

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
