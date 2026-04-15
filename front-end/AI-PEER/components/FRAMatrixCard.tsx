import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePrefs } from "@/src/prefs-context";
import { type ContrastPalette } from "@/src/theme";
import { useI18n } from "@/src/i18n";

type PhysicalRisk = "Low" | "High";
type PerceivedRisk = "Low" | "High";
type Quadrant = "Rational" | "Irrational" | "Incongruent" | "Congruent";

type Props = {
  inputs?: {
    btrackScore?: number;
    fesI?: number;
  };
  onBtrackUpdate?: (newScore: number) => void;
};

function computeFRA(btrackScore: number, fesI: number) {
  const physical: PhysicalRisk = btrackScore > 30 ? "High" : "Low";
  const perceived: PerceivedRisk = fesI > 23 ? "High" : "Low";

  let quadrant: Quadrant;
  if (physical === "Low" && perceived === "Low") quadrant = "Rational";
  else if (physical === "Low" && perceived === "High") quadrant = "Irrational";
  else if (physical === "High" && perceived === "Low") quadrant = "Incongruent";
  else quadrant = "Congruent";

  return { physical, perceived, quadrant };
}

function dotPosition(
  physical: PhysicalRisk,
  perceived: PerceivedRisk
): { x: `${number}%`; y: `${number}%` } {
  const x: `${number}%` = physical === "High" ? "75%" : "25%";
  const y: `${number}%` = perceived === "High" ? "25%" : "75%";
  return { x, y };
}

export default function FRAMatrixCard({ inputs, onBtrackUpdate }: Props) {
  const { colors, scaled } = usePrefs();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const btrackScore =
    typeof inputs?.btrackScore === "number" ? inputs.btrackScore : null;
  const fesI = typeof inputs?.fesI === "number" ? inputs.fesI : null;

  const displayBtrack = btrackScore ?? 0;
  const displayFesI = fesI ?? 28;

  const fra = useMemo(
    () => computeFRA(displayBtrack, displayFesI),
    [displayBtrack, displayFesI]
  );

  const pos = dotPosition(fra.physical, fra.perceived);
  const elevated = fra.quadrant !== "Rational";
  const hasBothScores = btrackScore !== null && fesI !== null;

  const quadrantLabel = (q: Quadrant) => {
    if (q === "Irrational") return t("fraMatrix.irrational");
    if (q === "Congruent") return t("fraMatrix.congruent");
    if (q === "Incongruent") return t("fraMatrix.incongruent");
    return t("fraMatrix.rational");
  };

  const handleEditBtrack = () => {
    Alert.prompt(
      t("fraMatrix.update_title"),
      t("fraMatrix.update_body"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: (value?: string) => {
            const num = parseFloat(value || "");
            if (!isNaN(num) && num >= 0) {
              onBtrackUpdate?.(num);
            } else {
              Alert.alert(t("fraMatrix.invalid_title"), t("fraMatrix.invalid_body"));
            }
          },
        },
      ],
      "plain-text",
      btrackScore !== null ? String(btrackScore) : "",
      "decimal-pad"
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { fontSize: scaled.base }]}>{t("fraMatrix.title")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.pill, elevated ? styles.pillBad : styles.pillGood]}>
            <Text style={[styles.pillText, { fontSize: scaled.small }]}>
              {!hasBothScores
                ? t("fraMatrix.incomplete")
                : elevated
                ? t("fraMatrix.elevated_risk")
                : t("fraMatrix.low_risk")}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.subtitle, { fontSize: scaled.small }]}>
        {t("fraMatrix.subtitle")}
      </Text>

      <View style={styles.readoutRow}>
        <Readout
          styles={styles}
          label={t("fraMatrix.label_btracks")}
          value={btrackScore !== null ? `${btrackScore} cm` : "-"}
          scaled={scaled.small}
        />
        <Readout
          styles={styles}
          label={t("fraMatrix.label_fesi")}
          value={fesI !== null ? `${fesI}` : "-"}
          scaled={scaled.small}
        />
        <Readout
          styles={styles}
          label={t("fraMatrix.label_quadrant")}
          value={hasBothScores ? quadrantLabel(fra.quadrant) : "-"}
          scaled={scaled.small}
        />
      </View>

      <View style={styles.matrixArea}>
        <View style={styles.yRail}>
          <View style={styles.yRailInner}>
            <Text style={[styles.ySideTitle, { fontSize: scaled.small }]}>{t("fraMatrix.perceived_fall_risk")}</Text>
            <Text style={[styles.ySideTick, { fontSize: scaled.small }]}>{t("fraMatrix.high_range")}</Text>
            <Text style={[styles.ySideTick, { fontSize: scaled.small }]}>{t("fraMatrix.low_range")}</Text>
          </View>
        </View>

        <View style={styles.matrix}>
          <View style={[styles.quad, styles.qTL, styles.badFill]} />
          <View style={[styles.quad, styles.qTR, styles.badFill]} />
          <View style={[styles.quad, styles.qBR, styles.badFill]} />
          <View style={[styles.quad, styles.qBL, styles.goodFill]} />

          <View style={styles.vLine} />
          <View style={styles.hLine} />

          <QuadLabel styles={styles} title={t("fraMatrix.irrational")} pos="tl" bad scaled={scaled.small} />
          <QuadLabel styles={styles} title={t("fraMatrix.congruent")} pos="tr" bad scaled={scaled.small} />
          <QuadLabel styles={styles} title={t("fraMatrix.incongruent")} pos="br" bad scaled={scaled.small} />
          <QuadLabel styles={styles} title={t("fraMatrix.rational")} pos="bl" good scaled={scaled.small} />

          <View
            style={[
              styles.dot,
              {
                left: pos.x,
                top: pos.y,
                transform: [{ translateX: -8 }, { translateY: -8 }],
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.xAxis}>
        <Text style={[styles.axisTitle, { fontSize: scaled.small }]}>{t("fraMatrix.physiological_fall_risk")}</Text>
        <Text style={[styles.axisHint, { fontSize: scaled.small }]}>{t("fraMatrix.axis_hint")}</Text>
        {onBtrackUpdate && (
          <TouchableOpacity onPress={handleEditBtrack} style={styles.editBtrackBtn}>
            <Ionicons name="create-outline" size={14} color={colors.text} />
            <Text style={[styles.editBtrackText, { fontSize: scaled.small }]}>{t("fraMatrix.edit_btracks")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Readout({
  styles,
  label,
  value,
  scaled,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  scaled: number;
}) {
  return (
    <View style={styles.readout}>
      <Text style={[styles.readoutLabel, { fontSize: Math.max(10, scaled - 2) }]}>{label}</Text>
      <Text style={[styles.readoutValue, { fontSize: scaled }]}>{value}</Text>
    </View>
  );
}

function QuadLabel({
  styles,
  title,
  pos,
  good,
  bad,
  scaled,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  pos: "tl" | "tr" | "bl" | "br";
  good?: boolean;
  bad?: boolean;
  scaled: number;
}) {
  return (
    <View
      style={[
        styles.qLabel,
        styles[pos],
        good && styles.qLabelGood,
        bad && styles.qLabelBad,
      ]}
    >
      <Text style={[styles.qText, { fontSize: scaled }]}>{title}</Text>
    </View>
  );
}

const createStyles = (colors: ContrastPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.bgTile,
      borderRadius: 16,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.background,
    },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    title: { fontWeight: "900", color: colors.text, flex: 1 },

    pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    pillGood: { backgroundColor: "#DFF3E5" },
    pillBad: { backgroundColor: "#FFE2E0" },
    pillText: { fontWeight: "900", color: "#111" },

    subtitle: { marginTop: 4, color: colors.text },

    readoutRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 6,
      flexWrap: "wrap",
    },
    readout: {
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 12,
      minWidth: 82,
    },
    readoutLabel: { fontWeight: "800", color: colors.muted },
    readoutValue: { marginTop: 3, fontWeight: "900", color: colors.text },

    matrixArea: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
    },

    yRail: {
      width: 44,
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    yRailInner: {
      transform: [{ rotate: "-90deg" }],
      alignItems: "center",
      justifyContent: "center",
      width: 220,
    },
    ySideTitle: { fontWeight: "900", color: colors.text },
    ySideTick: { marginTop: 4, fontWeight: "700", color: colors.text },

    matrix: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.background,
      overflow: "hidden",
      position: "relative",
      backgroundColor: colors.background,
      minHeight: 180,
    },

    quad: { position: "absolute", width: "50%", height: "50%" },
    qTL: { left: 0, top: 0 },
    qTR: { right: 0, top: 0 },
    qBL: { left: 0, bottom: 0 },
    qBR: { right: 0, bottom: 0 },

    goodFill: { backgroundColor: "#DFF3E5" },
    badFill: { backgroundColor: "#FFE2E0" },

    vLine: {
      position: "absolute",
      left: "50%",
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: colors.muted,
    },
    hLine: {
      position: "absolute",
      top: "50%",
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: colors.muted,
    },

    qLabel: {
      position: "absolute",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
    },
    qLabelGood: {
      backgroundColor: "rgba(223,243,229,0.96)",
      borderColor: "#BDE8CC",
    },
    qLabelBad: {
      backgroundColor: "rgba(255,226,224,0.96)",
      borderColor: "#F2B7B3",
    },
    qText: { fontWeight: "900", color: "#111" },

    tl: { top: 12, left: 12 },
    tr: { top: 12, right: 12 },
    bl: { bottom: 12, left: 12 },
    br: { bottom: 12, right: 12 },

    dot: {
      position: "absolute",
      width: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: colors.text,
      borderWidth: 4,
      borderColor: "#FFF",
    },

    xAxis: { alignItems: "center", marginTop: 10 },
    axisTitle: { fontWeight: "900", color: colors.text },
    axisHint: {
      marginTop: 2,
      color: colors.text,
      textAlign: "center",
      fontWeight: "700",
    },
    editBtrackBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 56,
      marginBottom: -48,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    editBtrackText: {
      fontWeight: "700",
      color: colors.text,
    },
  });
