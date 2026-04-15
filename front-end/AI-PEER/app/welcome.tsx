import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { type ContrastPalette, spacing, radii } from "../src/theme";
import type { Prefs } from "../src/prefs-context";
import { usePrefs } from "../src/prefs-context";
import { useI18n } from "../src/i18n";

type WelcomeProps = {
  onComplete?: (prefs: Prefs) => void;
};

const STEP_COUNT = 4;

type Option = {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

export default function Welcome({ onComplete }: WelcomeProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(0);
  const { scaled, colors, prefs, updatePrefs } = usePrefs();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const previewText = t("welcome.preview_text");

  function goNext() {
    if (step >= STEP_COUNT) {
      onComplete?.(prefs);
      return router.replace("/(tabs)");
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step <= 0) return;
    setStep((s) => s - 1);
  }

  function playAlertPreview() {
    if (!prefs.soundAlerts) return;

    if (Platform.OS !== "web" && Vibration) {
      Vibration.vibrate(120);
      return;
    }

    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          ctx.close?.();
        }, 150);
      }
    } catch {
      // no-op
    }
  }

  function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: colors.text, fontSize: scaled.h3 }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.muted, fontSize: scaled.small }]}>{subtitle}</Text>
        ) : null}
      </View>
    );
  }

  function OptionRow({ options }: { options: Option[] }) {
    return (
      <View style={styles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, opt.active && styles.optionSelected]}
            onPress={opt.onPress}
          >
            <Text
              style={[
                styles.optionText,
                { fontSize: scaled.small, color: opt.active ? "#FFFFFF" : colors.text },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 0 ? (
        <View style={styles.card}>
          <Text style={[styles.mainTitle, { color: colors.text, fontSize: scaled.h1 }]}>{t("welcome.intro_title")}</Text>
          <Text style={[styles.lead, { color: colors.muted, fontSize: scaled.base }]}>{t("welcome.intro_subtitle")}</Text>
          <TouchableOpacity
            accessibilityLabel={t("welcome.begin")}
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            onPress={() => setStep(1)}
          >
            <Text style={[styles.primaryButtonText, { fontSize: scaled.base }]}>{t("welcome.begin")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          {step === 1 && (
            <View>
              <StepHeader
                title={t("welcome.text_size_title")}
                subtitle={t("welcome.text_size_subtitle")}
              />
              <OptionRow
                options={[
                  {
                    key: "small",
                    label: t("common.small"),
                    active: prefs.fontScale === 0.9,
                    onPress: () => updatePrefs("fontScale", 0.9),
                  },
                  {
                    key: "normal",
                    label: t("common.normal"),
                    active: prefs.fontScale === 1,
                    onPress: () => updatePrefs("fontScale", 1),
                  },
                  {
                    key: "large",
                    label: t("common.large"),
                    active: prefs.fontScale === 1.1,
                    onPress: () => updatePrefs("fontScale", 1.1),
                  },
                ]}
              />

              <View style={styles.previewBox}>
                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                <Text style={{ color: colors.muted, marginTop: 8, fontSize: scaled.small }}>
                  {t("welcome.text_preview_note")}
                </Text>
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <StepHeader
                title={t("welcome.contrast_title")}
                subtitle={t("welcome.contrast_subtitle")}
              />
              <OptionRow
                options={[
                  {
                    key: "light",
                    label: t("common.light"),
                    active: prefs.contrast === "light",
                    onPress: () => updatePrefs("contrast", "light"),
                  },
                  {
                    key: "dark",
                    label: t("common.dark"),
                    active: prefs.contrast === "dark",
                    onPress: () => updatePrefs("contrast", "dark"),
                  },
                  {
                    key: "high",
                    label: t("common.high_contrast"),
                    active: prefs.contrast === "high",
                    onPress: () => updatePrefs("contrast", "high"),
                  },
                ]}
              />

              <View style={styles.previewBox}>
                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                <Text style={{ color: colors.muted, marginTop: 8, fontSize: scaled.small }}>
                  {t("welcome.contrast_preview_note")}
                </Text>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <StepHeader
                title={t("welcome.language_title")}
                subtitle={t("welcome.language_subtitle")}
              />
              <OptionRow
                options={[
                  {
                    key: "en",
                    label: "English",
                    active: prefs.language === "en",
                    onPress: () => updatePrefs("language", "en"),
                  },
                  {
                    key: "es",
                    label: "Español",
                    active: prefs.language === "es",
                    onPress: () => updatePrefs("language", "es"),
                  },
                  {
                    key: "ht",
                    label: "Kreyòl",
                    active: prefs.language === "ht",
                    onPress: () => updatePrefs("language", "ht"),
                  },
                ]}
              />

              <View style={styles.previewBox}>
                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <StepHeader title={t("welcome.sound_title")} subtitle={t("welcome.sound_subtitle")} />

              <View style={styles.soundRow}>
                <Text style={{ color: colors.text, fontSize: scaled.base }}>{t("welcome.sound_label")}</Text>
                <Switch
                  value={prefs.soundAlerts}
                  onValueChange={(v) => updatePrefs("soundAlerts", v)}
                  trackColor={{ true: colors.accent, false: colors.bgTile }}
                />
              </View>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.accent }]}
                onPress={playAlertPreview}
                accessibilityLabel={t("welcome.play_preview")}
              >
                <Text style={{ color: colors.accent, fontSize: scaled.base }}>{t("welcome.play_preview")}</Text>
              </TouchableOpacity>

              <View style={styles.previewBox}>
                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                <Text style={{ color: colors.muted, marginTop: 8, fontSize: scaled.small }}>
                  {t("welcome.sound_preview_note")}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomRow}>
            <TouchableOpacity
              onPress={goBack}
              disabled={step === 0}
              style={[styles.navButton, { opacity: step === 0 ? 0.5 : 1 }]}
            >
              <Text style={{ color: colors.text, fontSize: scaled.base }}>{t("common.back")}</Text>
            </TouchableOpacity>

            <View style={styles.progressDots}>
              {Array.from({ length: STEP_COUNT }).map((_, i) => {
                const active = i + 1 === step;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      active
                        ? { backgroundColor: colors.accent }
                        : { backgroundColor: colors.bgTile },
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              onPress={goNext}
              style={[styles.navButtonPrimary, { backgroundColor: colors.accent }]}
              accessibilityLabel={step === STEP_COUNT ? t("common.finish") : t("common.next")}
            >
              <Text style={{ color: "#fff", fontSize: scaled.base }}>
                {step === STEP_COUNT ? t("common.finish") : t("common.next")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ContrastPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing(5),
      justifyContent: "center",
    },
    card: {
      padding: spacing(4),
      borderRadius: radii.md,
      backgroundColor: colors.bgTile,
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { height: 2, width: 0 } },
        android: { elevation: 4 },
      }),
    },
    mainTitle: {
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 23,
    },
    title: {
      fontWeight: "700",
    },
    lead: {
      textAlign: "center",
      marginBottom: spacing(8),
    },
    subtitle: {
      opacity: 0.95,
    },
    primaryButton: {
      marginTop: spacing(3),
      padding: spacing(3),
      borderRadius: radii.md,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginVertical: 8,
    },
    option: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing(3),
      marginHorizontal: spacing(1.5),
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.muted,
    },
    optionSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionText: {
      fontWeight: "700",
    },
    previewBox: {
      marginTop: spacing(3),
      padding: spacing(3),
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.muted,
    },
    soundRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 12,
    },
    bottomRow: {
      marginTop: spacing(4),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: {
      padding: spacing(2.5),
    },
    navButtonPrimary: {
      paddingVertical: spacing(2.5),
      paddingHorizontal: spacing(4),
      borderRadius: radii.md,
    },
    progressDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing(1.5),
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: spacing(1),
    },
    secondaryButton: {
      padding: spacing(2.5),
      alignItems: "center",
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing(2),
      backgroundColor: colors.background,
    },
  });
