import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

type PhysicalRisk = "Low" | "High";
type PerceivedRisk = "Low" | "High";
type Quadrant = "Rational" | "Irrational" | "Incongruent" | "Congruent";

type FRAInputs = {
  tandemSeconds: number; // full-tandem seconds
  fesI: number;          // FES-I total score
};

type Props = {
  /** Backend-ready: pass real values later */
  inputs?: Partial<FRAInputs>;
  title?: string; // default: "Today’s Risk (FRA)"
};

function computeFRA(tandemSeconds: number, fesI: number) {
  const physical: PhysicalRisk = tandemSeconds < 10 ? "High" : "Low";
  const perceived: PerceivedRisk = fesI > 23 ? "High" : "Low";

  let quadrant: Quadrant;
  if (physical === "Low" && perceived === "Low") quadrant = "Rational";
  else if (physical === "Low" && perceived === "High") quadrant = "Irrational";
  else if (physical === "High" && perceived === "Low") quadrant = "Incongruent";
  else quadrant = "Congruent";

  const maladaptive = quadrant === "Irrational" || quadrant === "Incongruent";
  const riskLevel: "Low Risk" | "High Risk" = maladaptive ? "High Risk" : "Low Risk";

  return { physical, perceived, quadrant, maladaptive, riskLevel };
}

// X: perceived (low left, high right) | Y: physical (low bottom, high top)
// Note: RN y grows downward, so top is smaller numbers.
function dotPosition(physical: PhysicalRisk, perceived: PerceivedRisk) {
  const x = perceived === "High" ? 0.75 : 0.25;
  const y = physical === "High" ? 0.25 : 0.75;
  return { x, y };
}

export default function FRAMatrixCard({ inputs, title = "Today’s Risk (FRA)" }: Props) {
  // Demo defaults so it works with NO backend + NO props
  const [demo] = useState<FRAInputs>({ tandemSeconds: 7.2, fesI: 28 });

  // Merge: if inputs missing, use demo values
  const tandemSeconds =
    typeof inputs?.tandemSeconds === "number" && Number.isFinite(inputs.tandemSeconds)
      ? inputs.tandemSeconds
      : demo.tandemSeconds;

  const fesI =
    typeof inputs?.fesI === "number" && Number.isFinite(inputs.fesI)
      ? inputs.fesI
      : demo.fesI;

  const fra = useMemo(() => computeFRA(tandemSeconds, fesI), [tandemSeconds, fesI]);
  const pos = useMemo(() => dotPosition(fra.physical, fra.perceived), [fra.physical, fra.perceived]);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.pill, fra.riskLevel === "High Risk" ? styles.pillHigh : styles.pillLow]}>
          <Text style={styles.pillText}>{fra.riskLevel}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Based on alignment of physical fall risk (tandem stand) and perceived fall risk (FES-I).
      </Text>

      {/* Readouts */}
      <View style={styles.readoutRow}>
        <View style={styles.readoutPill}>
          <Text style={styles.readoutLabel}>Tandem</Text>
          <Text style={styles.readoutValue}>{tandemSeconds.toFixed(1)}s</Text>
          <Text style={styles.readoutHint}>{tandemSeconds < 10 ? "High physical" : "Low physical"}</Text>
        </View>

        <View style={styles.readoutPill}>
          <Text style={styles.readoutLabel}>FES-I</Text>
          <Text style={styles.readoutValue}>{fesI}</Text>
          <Text style={styles.readoutHint}>{fesI > 23 ? "High perceived" : "Low perceived"}</Text>
        </View>

        <View style={styles.readoutPill}>
          <Text style={styles.readoutLabel}>Quadrant</Text>
          <Text style={styles.readoutValue}>{fra.quadrant}</Text>
          <Text style={styles.readoutHint}>{fra.maladaptive ? "Maladaptive" : "Adaptive"}</Text>
        </View>
      </View>

      {/* Single 4-quadrant graph */}
      <View style={styles.chartBlock}>
        <View style={styles.yAxis}>
          <Text style={styles.axisTitle}>Physical</Text>
          <Text style={styles.axisHint}>High: &lt;10s{"\n"}Low: ≥10s</Text>
        </View>

        <View style={styles.chartWrap}>
          <View style={styles.chartSquare}>
            <View style={styles.vLine} />
            <View style={styles.hLine} />

            {/* labels */}
            <View style={[styles.qLabel, styles.qTL]}>
              <Text style={styles.qTitle}>Incongruent</Text>
              <Text style={styles.qTag}>Maladaptive</Text>
            </View>
            <View style={[styles.qLabel, styles.qTR]}>
              <Text style={styles.qTitle}>Congruent</Text>
              <Text style={styles.qTag}>Adaptive</Text>
            </View>
            <View style={[styles.qLabel, styles.qBL]}>
              <Text style={styles.qTitle}>Rational</Text>
              <Text style={styles.qTag}>Adaptive</Text>
            </View>
            <View style={[styles.qLabel, styles.qBR]}>
              <Text style={styles.qTitle}>Irrational</Text>
              <Text style={styles.qTag}>Maladaptive</Text>
            </View>

            {/* dot */}
            <View
              style={[
                styles.dot,
                {
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  transform: [{ translateX: -6 }, { translateY: -6 }],
                },
              ]}
            />
          </View>

          <View style={styles.xAxis}>
            <Text style={styles.axisTitle}>Perceived (FES-I)</Text>
            <Text style={styles.axisHint}>Low: ≤23   ·   High: &gt;23</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "900", color: "#222" },
  subtitle: { marginTop: 6, fontSize: 12, color: "#555" },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillHigh: { backgroundColor: "#FFEBEE" },
  pillLow: { backgroundColor: "#EEF8F0" },
  pillText: { fontSize: 12, fontWeight: "900", color: "#111" },

  readoutRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  readoutPill: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  readoutLabel: { fontSize: 10, color: "#666", fontWeight: "800" },
  readoutValue: { marginTop: 2, fontSize: 12, fontWeight: "900" },
  readoutHint: { marginTop: 2, fontSize: 10, color: "#666" },

  chartBlock: { marginTop: 12, flexDirection: "row", gap: 10 },
  yAxis: { width: 92, justifyContent: "center" },
  chartWrap: { flex: 1 },

  chartSquare: {
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    overflow: "hidden",
    position: "relative",
  },
  vLine: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "#DDD" },
  hLine: { position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "#DDD" },

  qLabel: { position: "absolute", paddingHorizontal: 10, paddingVertical: 8, maxWidth: "48%" },
  qTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  qTag: { marginTop: 2, fontSize: 10, fontWeight: "800", color: "#666" },
  qTL: { left: 6, top: 6 },
  qTR: { right: 6, top: 6, alignItems: "flex-end" },
  qBL: { left: 6, bottom: 6 },
  qBR: { right: 6, bottom: 6, alignItems: "flex-end" },

  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#111",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },

  xAxis: { alignItems: "center", marginTop: 8 },
  axisTitle: { fontSize: 11, fontWeight: "900", color: "#333" },
  axisHint: { marginTop: 2, fontSize: 10, color: "#666", textAlign: "center" },
});