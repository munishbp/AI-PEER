import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

type PhysicalRisk = "Low" | "High";
type PerceivedRisk = "Low" | "High";
type Quadrant = "Rational" | "Irrational" | "Incongruent" | "Congruent";

type Props = {
  inputs?: {
    tandemSeconds?: number; // full-tandem stand seconds
    fesI?: number; // FES-I total score
  };
};

function computeFRA(tandemSeconds: number, fesI: number) {
  // Paper: <= 10s low physiological, > 10s high physiological
  const physical: PhysicalRisk = tandemSeconds > 10 ? "High" : "Low";
  // Paper: 16–23 low perceived, 24–64 high perceived
  const perceived: PerceivedRisk = fesI > 23 ? "High" : "Low";

  let quadrant: Quadrant;
  if (physical === "Low" && perceived === "Low") quadrant = "Rational";
  else if (physical === "Low" && perceived === "High") quadrant = "Irrational";
  else if (physical === "High" && perceived === "Low") quadrant = "Incongruent";
  else quadrant = "Congruent";

  return { physical, perceived, quadrant };
}

// Dot centered in the chosen quadrant (simple + clear for now)
function dotPosition(physical: PhysicalRisk, perceived: PerceivedRisk) {
  const x = physical === "High" ? "75%" : "25%";
  const y = perceived === "High" ? "25%" : "75%"; // RN y grows downward
  return { x, y };
}

export default function FRAMatrixCard({ inputs }: Props) {
  const tandemSeconds =
    typeof inputs?.tandemSeconds === "number" ? inputs.tandemSeconds : 7.2;
  const fesI = typeof inputs?.fesI === "number" ? inputs.fesI : 28;

  const fra = useMemo(
    () => computeFRA(tandemSeconds, fesI),
    [tandemSeconds, fesI]
  );

  const pos = dotPosition(fra.physical, fra.perceived);
  const elevated = fra.quadrant !== "Rational";

  return (
    <View style={styles.card}>
      {/* Header (smaller) */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today’s Risk (FRA)</Text>
        <View style={[styles.pill, elevated ? styles.pillBad : styles.pillGood]}>
          <Text style={styles.pillText}>
            {elevated ? "Elevated Risk" : "Low Risk"}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Based on alignment of physical fall risk (tandem stand) and perceived
        fall risk (FES-I).
      </Text>

      {/* Readouts (smaller + tighter) */}
      <View style={styles.readoutRow}>
        <Readout label="Tandem" value={`${tandemSeconds.toFixed(1)}s`} />
        <Readout label="FES-I" value={`${fesI}`} />
        <Readout label="Quadrant" value={fra.quadrant} />
      </View>

      {/* ===== MATRIX AREA (bigger) ===== */}
      <View style={styles.matrixArea}>
        {/* Everything on Y axis rotated sideways */}
        <View style={styles.yRail}>
          <View style={styles.yRailInner}>
            <Text style={styles.ySideTitle}>Perceived fall risk</Text>
            <Text style={styles.ySideTick}>High: 24–64</Text>
            <Text style={styles.ySideTick}>Low: 16–23</Text>
          </View>
        </View>

        {/* Big matrix */}
        <View style={styles.matrix}>
          {/* Quadrant fills */}
          <View style={[styles.quad, styles.qTL, styles.badFill]} />
          <View style={[styles.quad, styles.qTR, styles.badFill]} />
          <View style={[styles.quad, styles.qBR, styles.badFill]} />
          <View style={[styles.quad, styles.qBL, styles.goodFill]} />

          {/* Crosshair */}
          <View style={styles.vLine} />
          <View style={styles.hLine} />

          {/* Labels */}
          <QuadLabel title="Irrational" pos="tl" bad />
          <QuadLabel title="Congruent" pos="tr" bad />
          <QuadLabel title="Incongruent" pos="br" bad />
          <QuadLabel title="Rational" pos="bl" good />

          {/* Dot */}
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

      {/* X axis (slightly smaller) */}
      <View style={styles.xAxis}>
        <Text style={styles.axisTitle}>Physiological fall risk</Text>
        <Text style={styles.axisHint}>≤ 10s (Low) · &gt; 10s (High)</Text>
      </View>
    </View>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue}>{value}</Text>
    </View>
  );
}

function QuadLabel({
  title,
  pos,
  good,
  bad,
}: {
  title: string;
  pos: "tl" | "tr" | "bl" | "br";
  good?: boolean;
  bad?: boolean;
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
      <Text style={styles.qText}>{title}</Text>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillGood: { backgroundColor: "#DFF3E5" },
  pillBad: { backgroundColor: "#FFE2E0" },
  pillText: { fontWeight: "900", color: "#111", fontSize: 12 },

  subtitle: { marginTop: 6, fontSize: 11, color: "#555" },

  readoutRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  readout: {
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 82,
  },
  readoutLabel: { fontSize: 9, fontWeight: "800", color: "#666" },
  readoutValue: { marginTop: 3, fontWeight: "900", fontSize: 13, color: "#111" },

  /** ===== MATRIX AREA ===== */
  matrixArea: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  // A narrow vertical rail on the left; everything inside is rotated
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
    width: 220, // gives room after rotate
  },
  ySideTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  ySideTick: { marginTop: 4, fontSize: 11, fontWeight: "700", color: "#555" },

  // BIG matrix square: takes more space
  matrix: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DADADA",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FAFAFA",
    minHeight: 320, // bigger than before
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
    backgroundColor: "#8F8F8F",
  },
  hLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#8F8F8F",
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
  qText: { fontWeight: "900", fontSize: 12, color: "#111" },

  tl: { top: 12, left: 12 },
  tr: { top: 12, right: 12 },
  bl: { bottom: 12, left: 12 },
  br: { bottom: 12, right: 12 },

  dot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#111",
    borderWidth: 4,
    borderColor: "#FFF",
  },

  xAxis: { alignItems: "center", marginTop: 10 },
  axisTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  axisHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    fontWeight: "700",
  },
});
