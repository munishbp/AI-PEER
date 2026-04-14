import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePrefs } from "../../src/prefs-context";
import { type ContrastPalette } from "../../src/theme";
import {
  ExerciseCompletionRecord,
  FeedbackEvent,
  getExerciseActivityRecords,
} from "../../src/exercise-activity-storage";

// Severity → sort weight. Higher = more important.
const SEVERITY_WEIGHT: Record<FeedbackEvent["severity"], number> = {
  severe: 4,
  error: 3,
  moderate: 2,
  warning: 1,
  mild: 0,
};

// Severity → dot color.
function severityColor(
  severity: FeedbackEvent["severity"],
  colors: ContrastPalette
): string {
  if (severity === "severe" || severity === "error") return "#ef4444";
  if (severity === "moderate" || severity === "warning") return "#f59e0b";
  return colors.muted;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#9BA1A6";
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export default function ExerciseSummaryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, scaled } = usePrefs();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { recordId } = useLocalSearchParams<{ recordId: string }>();

  const [record, setRecord] = useState<ExerciseCompletionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const records = await getExerciseActivityRecords();
        const found = records.find((r) => r.id === recordId) ?? null;
        if (mounted) setRecord(found);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [recordId]);

  const topFeedback = useMemo<FeedbackEvent[]>(() => {
    if (!record) return [];
    return [...record.feedbackEvents]
      .sort((a, b) => {
        const dw = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        return dw !== 0 ? dw : b.count - a.count;
      })
      .slice(0, 3);
  }, [record]);

  const onDone = () => {
    router.replace("/(tabs)/exercise");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={[styles.mutedText, { fontSize: scaled.base }]}>
            {t("exercise-summary.notFound")}
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { marginTop: 16 }]}
            onPress={onDone}
            activeOpacity={0.85}
          >
            <Text style={[styles.doneBtnText, { fontSize: scaled.base }]}>
              {t("exercise-summary.done")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const score = record.avgScore;
  const scoreBadge = scoreColor(score);
  const encouragingEmpty =
    topFeedback.length === 0 && (score === null || score >= 80);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons
            name="checkmark-circle"
            size={28}
            color={colors.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { fontSize: scaled.h2 }]}>
              {t("exercise-summary.title")}
            </Text>
            <Text style={[styles.mutedText, { fontSize: scaled.base * 0.8 }]}>
              {record.exerciseName}
            </Text>
          </View>
        </View>

        {/* Average form score */}
        <View style={styles.card}>
          <Text style={[styles.cardLabel, { fontSize: scaled.base * 0.85 }]}>
            {t("exercise-session.averageScore")}
          </Text>
          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.scoreNumber,
                { color: scoreBadge, fontSize: scaled.h1 * 1.6 },
              ]}
            >
              {score === null ? t("exercise-summary.notAvailable") : score}
            </Text>
            {score !== null && (
              <Text
                style={[
                  styles.scoreSuffix,
                  { color: scoreBadge, fontSize: scaled.h2 },
                ]}
              >
                /100
              </Text>
            )}
          </View>
          {score === null && (
            <Text
              style={[
                styles.mutedText,
                { fontSize: scaled.base * 0.8, marginTop: 4 },
              ]}
            >
              {t("exercise-summary.noFormAnalysis")}
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { fontSize: scaled.h2 }]}>
              {record.totalReps}
            </Text>
            <Text style={[styles.statLabel, { fontSize: scaled.base * 0.75 }]}>
              {t("exercise-summary.reps")}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { fontSize: scaled.h2 }]}>
              {record.setsCompleted}
            </Text>
            <Text style={[styles.statLabel, { fontSize: scaled.base * 0.75 }]}>
              {t("exercise-summary.sets")}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { fontSize: scaled.h2 }]}>
              {formatDuration(record.durationSec)}
            </Text>
            <Text style={[styles.statLabel, { fontSize: scaled.base * 0.75 }]}>
              {t("exercise-summary.duration")}
            </Text>
          </View>
        </View>

        {/* Top feedback card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>
            {t("exercise-summary.topFeedback")}
          </Text>
          {encouragingEmpty ? (
            <View style={styles.encourageRow}>
              <Ionicons name="thumbs-up" size={20} color="#10b981" />
              <Text
                style={[styles.encourageText, { fontSize: scaled.base * 0.9 }]}
              >
                {t("exercise-summary.greatForm")}
              </Text>
            </View>
          ) : topFeedback.length === 0 ? (
            <Text
              style={[
                styles.mutedText,
                { fontSize: scaled.base * 0.85, marginTop: 8 },
              ]}
            >
              {t("exercise-session.noDataRecorded")}
            </Text>
          ) : (
            topFeedback.map((ev, i) => (
              <View key={`${ev.message}-${i}`} style={styles.feedbackRow}>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: severityColor(ev.severity, colors) },
                  ]}
                />
                <Text
                  style={[
                    styles.feedbackMessage,
                    { fontSize: scaled.base * 0.9 },
                  ]}
                  numberOfLines={2}
                >
                  {ev.message}
                </Text>
                <Text
                  style={[
                    styles.feedbackCount,
                    { fontSize: scaled.base * 0.8 },
                  ]}
                >
                  {ev.count}×
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={onDone}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnText, { fontSize: scaled.base }]}>
            {t("exercise-summary.done")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ContrastPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: {
      padding: 20,
      paddingBottom: 80,
      gap: 16,
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 4,
    },
    heading: {
      color: colors.text,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    mutedText: { color: colors.muted },
    card: {
      backgroundColor: colors.bgTile,
      borderRadius: 14,
      padding: 18,
    },
    cardLabel: { color: colors.muted, fontWeight: "600" },
    cardTitle: {
      color: colors.text,
      fontWeight: "700",
      marginBottom: 10,
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      marginTop: 4,
    },
    scoreNumber: { fontWeight: "800", letterSpacing: -1 },
    scoreSuffix: { fontWeight: "600", marginBottom: 6 },
    statsRow: {
      flexDirection: "row",
      gap: 10,
    },
    statCell: {
      flex: 1,
      backgroundColor: colors.bgTile,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    statValue: {
      color: colors.text,
      fontWeight: "800",
    },
    statLabel: {
      color: colors.muted,
      fontWeight: "600",
      marginTop: 2,
    },
    feedbackRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
    },
    severityDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    feedbackMessage: {
      flex: 1,
      color: colors.text,
      fontWeight: "500",
    },
    feedbackCount: {
      color: colors.muted,
      fontWeight: "700",
    },
    encourageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    encourageText: {
      color: colors.text,
      fontWeight: "600",
    },
    doneBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 6,
    },
    doneBtnText: {
      color: "#FFF",
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
}
