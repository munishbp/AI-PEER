import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePrefs } from "../src/prefs-context";
import { type ContrastPalette, radii, spacing } from "../src/theme";
import { useI18n } from "../src/i18n";

type Step = {
  title: string;
  description: string;
  imageNote: string;
};

export default function Tutorial() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { scaled, colors } = usePrefs();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [current, setCurrent] = useState(0);

  const steps: Step[] = useMemo(
    () => [
      {
        title: t("tutorial.step_1_title"),
        description: t("tutorial.step_1_desc"),
        imageNote: t("tutorial.step_1_note"),
      },
      {
        title: t("tutorial.step_2_title"),
        description: t("tutorial.step_2_desc"),
        imageNote: t("tutorial.step_2_note"),
      },
      {
        title: t("tutorial.step_3_title"),
        description: t("tutorial.step_3_desc"),
        imageNote: t("tutorial.step_3_note"),
      },
    ],
    [t]
  );

  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const step = steps[current];

  const destination = useMemo(
    () => (next === "welcome" ? "/welcome" : "/(tabs)"),
    [next]
  );

  const onPrev = () => {
    if (isFirst) return;
    setCurrent((prev) => prev - 1);
  };

  const onNext = () => {
    if (!isLast) {
      setCurrent((prev) => prev + 1);
      return;
    }
    router.replace(destination);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.brand, { fontSize: scaled.h3 }]}>{t("common.app_name")}</Text>
        <TouchableOpacity onPress={() => router.replace(destination)}>
          <Text style={[styles.skipText, { fontSize: scaled.small }]}>{t("tutorial.skip")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: scaled.h2 }]}>{step.title}</Text>
        <Text style={[styles.description, { fontSize: scaled.base }]}>
          {step.description}
        </Text>

        <View style={styles.imageFrame}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={38} color={colors.muted} />
            <Text style={[styles.imageNote, { fontSize: scaled.small }]}>
              {step.imageNote}
            </Text>
          </View>

          <View style={styles.bottomNav}>
            <TouchableOpacity
              onPress={onPrev}
              disabled={isFirst}
              style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
            >
              <Text style={[styles.navText, { fontSize: scaled.base }]}>{t("tutorial.prev")}</Text>
            </TouchableOpacity>

            <View style={styles.dots}>
              {steps.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === current && styles.dotActive]}
                />
              ))}
            </View>

            <TouchableOpacity onPress={onNext} style={styles.navBtnPrimary}>
              <Text style={[styles.navTextPrimary, { fontSize: scaled.base }]}>
                {isLast ? t("tutorial.finish") : t("tutorial.next")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ContrastPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing(5),
    justifyContent: "center",
    gap: spacing(4),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontWeight: "800",
    color: colors.text,
  },
  skipText: {
    color: colors.accent,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.bgTile,
    borderRadius: radii.lg,
    padding: spacing(4),
    gap: spacing(3),
  },
  title: {
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    color: colors.text,
    lineHeight: 22,
  },
  imageFrame: {
    marginTop: spacing(1),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.background,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(5),
    gap: spacing(2),
  },
  imageNote: {
    textAlign: "center",
    color: colors.muted,
    fontWeight: "600",
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.muted,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: {
    opacity: 0.45,
  },
  navText: {
    color: colors.text,
    fontWeight: "700",
  },
  navBtnPrimary: {
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  navTextPrimary: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.bgTile,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
});
