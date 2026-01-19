import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";

type Props = {
  data: { label: string; value: number }[];
  height?: number;
  showValues?: boolean;
};

type Point = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function LineGraph({ data, height = 120, showValues = true }: Props) {
  const [w, setW] = useState(0);

  const maxV = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minV = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);

  const points: Point[] = useMemo(() => {
    if (!w || data.length < 2) return [];
    const padX = 10;
    const padY = 12;
    const innerW = w - padX * 2;
    const innerH = height - padY * 2;

    return data.map((d, i) => {
      const t = (data.length === 1) ? 0 : i / (data.length - 1);
      const x = padX + innerW * t;

      const norm = (d.value - minV) / (maxV - minV || 1);
      const y = padY + innerH * (1 - clamp(norm, 0, 1));
      return { x, y };
    });
  }, [w, height, data, maxV, minV]);

  function onLayout(e: LayoutChangeEvent) {
    setW(e.nativeEvent.layout.width);
  }

  return (
    <View onLayout={onLayout} style={[styles.wrap, { height }]}>
      {/* segments */}
      {points.map((p, i) => {
        if (i === 0) return null;
        const p0 = points[i - 1];
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={`seg-${i}`}
            style={[
              styles.segment,
              { width: len, left: p0.x, top: p0.y, transform: [{ rotate: `${angle}deg` }] },
            ]}
          />
        );
      })}

      {/* points */}
      {points.map((p, i) => (
        <View key={`pt-${i}`} style={[styles.point, { left: p.x - 4, top: p.y - 4 }]} />
      ))}

      {/* labels */}
      <View style={styles.labelsRow}>
        {data.map((d) => (
          <View key={d.label} style={styles.labelCell}>
            {showValues && <Text style={styles.valueText}>{d.value}</Text>}
            <Text style={styles.labelText}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#F4E3D6",
    overflow: "hidden",
    paddingTop: 10,
  },
  segment: {
    position: "absolute",
    height: 3,
    backgroundColor: "#D84535",
    borderRadius: 999,
    transformOrigin: "left center",
  },
  point: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D84535",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  labelsRow: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  labelCell: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  valueText: { fontSize: 11, fontWeight: "800", color: "#5B4636", marginBottom: 2 },
  labelText: { fontSize: 11, color: "#5B4636" },
});
