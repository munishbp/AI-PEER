import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  /** 0–100 */
  riskPercent: number;
  caption?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * FRA-style 5x5 matrix visualization (Likelihood x Impact).
 * Current mapping uses riskPercent -> highlighted cell (placeholder).
 * Later you can replace this with real likelihood/impact from backend.
 */
export default function FRAMatrixGraph({ riskPercent, caption = "FRA Risk Matrix" }: Props) {
  const level = clamp(Math.floor(riskPercent / 20), 0, 4);

  const active = useMemo(() => {
    // higher risk shows up toward top-right
    const col = level;      // impact
    const row = 4 - level;  // likelihood
    return { row, col };
  }, [level]);

  return (
    <View>
      <View style={styles.axisRow}>
        <Text style={styles.axisLeftPad} />
        <Text style={styles.axisTop}>Impact →</Text>
      </View>

      <View style={styles.matrixWrap}>
        <View style={styles.leftAxis}>
          <Text style={styles.axisSide}>Likelihood</Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: 5 }).map((_, r) => (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: 5 }).map((_, c) => {
                const isActive = r === active.row && c === active.col;
                return (
                  <View
                    key={c}
                    style={[styles.cell, cellBg(r, c), isActive && styles.activeCell]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function cellBg(r: number, c: number) {
  // warm toward top-right
  const score = (4 - r) + c; // 0..8
  if (score <= 2) return { backgroundColor: "#E7F6EA" };
  if (score <= 5) return { backgroundColor: "#FFF3D6" };
  return { backgroundColor: "#FAD9D6" };
}

const styles = StyleSheet.create({
  axisRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  axisLeftPad: { width: 24 },
  axisTop: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "800", color: "#5B4636" },

  matrixWrap: { flexDirection: "row", alignItems: "center" },
  leftAxis: { width: 24, alignItems: "center", justifyContent: "center" },
  axisSide: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5B4636",
    transform: [{ rotate: "-90deg" }],
    width: 80,
    textAlign: "center",
  },

  grid: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6D4C6",
  },
  gridRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E6D4C6",
  },
  activeCell: { borderWidth: 2, borderColor: "#D84535" },

  caption: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#7A6659", textAlign: "center" },
});
