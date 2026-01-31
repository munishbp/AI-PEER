import { useState, useMemo } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Platform, Switch, Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radii, fontSizes } from "../src/theme";
import type { Prefs } from "../src/prefs-context";
import { usePrefs } from "../src/prefs-context";

type WelcomeProps = {
    onComplete?: (prefs: Prefs) => void;
};

const StepCount = 4;

export default function Welcome({ onComplete }: WelcomeProps) {
    const router = useRouter();
    const [step, setStep] = useState<number>(0); // 0 = intro, 1..4 steps
    const { scaled, colors, prefs, updatePrefs } = usePrefs();

    const previewText = useMemo(() => {
        switch (prefs.language) {
            case "es":
                return "¡Bienvenido a AI PEER! Este es un texto de vista previa.";
            case "fr":
                return "Bienvenue sur AI PEER ! Ceci est un exemple de texte.";
            default:
                return "Welcome to AI PEER! This is a preview of your settings.";
        }
    }, [prefs.language]);


    function goNext() {
        if (step >= StepCount) {
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
        // Try vibration on native devices
        if (Platform.OS !== "web" && Vibration) {
            Vibration.vibrate(120);
            return;
        }
        // Web: try simple beep using AudioContext
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

    /* Small helper UI components */
    function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
        return (
            <View style={{ marginBottom: 12 }}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text> : null}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {step === 0 ? (
                <View style={styles.card}>
                    <Text style={[styles.mainTitle, { color: colors.text, fontSize: scaled.h1 }]}>Let's Get You Set Up!</Text>
                    <Text style={[styles.lead, { color: colors.muted, fontSize: scaled.h1/2 }]}>Welcome to AI PEER. We'll help you personalize your experience in just a few simple steps.</Text>
                    <TouchableOpacity
                        accessibilityLabel="Let's Begin"
                        style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                        onPress={() => setStep(1)}
                    >
                        <Text style={[styles.primaryButtonText, { fontSize: scaled.base }]}>Let's Begin</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.card}>
                    {/* Step content */}
                    {step === 1 && (
                        <View>
                            <StepHeader title="Choose Your Text Size" subtitle="Select a comfortable reading size that works best for you" />
                            <View style={{ marginVertical: 8 }}>
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.sizeOption, prefs.fontScale === 0.9 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 0.9)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: fontSizes.small,  color: "#fff" }]}>A</Text>
                                        <Text style={{ color: "#fff" }}>Small</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sizeOption, prefs.fontScale === 1 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 1)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: fontSizes.h3-0.5,  color: "#fff"  }]}>A</Text>
                                        <Text style={{  color: "#fff"  }}>Default</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sizeOption, prefs.fontScale === 1.1 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 1.1)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: fontSizes.h2,  color: "#fff"  }]}>A</Text>
                                        <Text style={{ color: "#fff" }}>Large</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.previewBox}>
                                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                                <Text style={{ color: colors.text, marginTop: 8, fontSize: scaled.small }}>*Preview adjusts as you change text size.</Text>
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View>
                            <StepHeader title="Adjust Display Settings" subtitle="Pick colors and contrast that are easy on your eyes" />
                            <View style={{ marginVertical: 8 }}>
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.contrastOption, prefs.contrast === "light" && styles.optionSelected]}
                                        onPress={() => updatePrefs("contrast", "light")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: fontSizes.small }}>Light</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.contrastOption, prefs.contrast === "dark" && styles.optionSelected]}
                                        onPress={() => updatePrefs("contrast", "dark")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: fontSizes.small }}>Dark</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.contrastOption, prefs.contrast === "high" && styles.optionSelected]}
                                        onPress={() => updatePrefs("contrast", "high")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: (fontSizes.small-0.3), textAlign: "center" }}>High Contrast</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.previewBox, { backgroundColor: colors.background }]}>
                                <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                                <Text style={{ color: colors.text, marginTop: 8, fontSize: scaled.small }}>*Preview shows your chosen contrast and colors.</Text>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View>
                            <StepHeader title="Set Your Language" subtitle="Choose your language for the app" />
                            <View style={{ marginVertical: 8 }}>
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.langOption, prefs.language === "en" && styles.optionSelected]}
                                        onPress={() => updatePrefs("language", "en")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: (fontSizes.small+0.5) }}>English</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.langOption, prefs.language === "es" && styles.optionSelected]}
                                        onPress={() => updatePrefs("language", "es")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: (fontSizes.small+0.5) }}>Español</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.langOption, prefs.language === "fr" && styles.optionSelected]}
                                        onPress={() => updatePrefs("language", "fr")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: fontSizes.small }}>Français</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.previewBox}>
                                  <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                            </View>
                        </View>
                    )}

                    {step === 4 && (
                        <View>
                            <StepHeader title="Sound Alerts" subtitle="Enable or disable alert sounds for notifications" />
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 }}>
                                <Text style={{ color: colors.text }}>Sound Alerts</Text>
                                <Switch
                                    value={prefs.soundAlerts}
                                    onValueChange={(v) => updatePrefs("soundAlerts", v)}
                                    trackColor={{ true: colors.accent, false: "#ccc" }}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: colors.accent }]}
                                onPress={playAlertPreview}
                                accessibilityLabel="Play alert preview"
                            >
                                <Text style={{ color: colors.accent }}>Play Alert Preview</Text>
                            </TouchableOpacity>

                            <View style={styles.previewBox}>
                                    <Text style={{ color: colors.text, fontSize: scaled.base }}>{previewText}</Text>
                                    <Text style={{ color: colors.text, marginTop: 8, fontSize: scaled.small }}>
                                    *Toggle sound alerts and play a short preview (uses vibration on device or beep on web).
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Navigation */}
                    <View style={styles.bottomRow}>
                        <TouchableOpacity onPress={goBack} disabled={step === 0} style={[styles.navButton, { opacity: step === 0 ? 0.5 : 1 }]}>
                            <Text style={{ color: colors.text }}>Back</Text>
                        </TouchableOpacity>

                        <View style={styles.progressDots}>
                            {Array.from({ length: StepCount }).map((_, i) => {
                                const active = i + 1 === step;
                                return <View key={i} style={[styles.dot, active ? { backgroundColor: colors.accent } : { backgroundColor: "#ccc" }]} />;
                            })}
                        </View>

                        <TouchableOpacity
                            onPress={goNext}
                            style={[styles.navButtonPrimary, { backgroundColor: colors.accent }]}
                            accessibilityLabel={step === StepCount ? "Finish setup" : "Next"}
                        >
                            <Text style={{ color: "#fff" }}>{step === StepCount ? "Finish" : "Next"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing(5),
        justifyContent: "center",
    },
    card: {
        padding: spacing(4),
        borderRadius: radii.md,
        // subtle shadow for native
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { height: 2, width: 0 } },
            android: { elevation: 4 },
        }),
    },
    mainTitle: {
        fontSize: fontSizes.h2,
        textAlign: "center",
        fontWeight: "700",
        marginBottom: 23,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
    },
    lead: {
        fontSize: fontSizes.small,
        textAlign: "center",
        marginBottom: spacing(8),
    },
    subtitle: {
        fontSize: 13,
        opacity: 0.85,
    },
    smallNote: {
        fontSize: 12,
        textAlign: "center",
        marginTop: spacing(10),
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
    },
    sizeOption: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.primary,
    },
    optionSelected: {
        backgroundColor: "#575757ff",
    },
    contrastOption: {
        flex: 1,
        alignItems: "center",
        textAlign: "center",
        justifyContent: "center",
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.primary,
    },
    langOption: {
        flex: 1,
        alignItems: "center",
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.primary,
    },
    previewLabel: {
        fontWeight: "700",
    },
    previewBox: {
        marginTop: spacing(3),
        padding: spacing(3),
        borderRadius: radii.md,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.gray,
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
    },
});