import React, { useState, useMemo } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Switch, Vibration,
    //Slider as RNSlider, // may be deprecated; included as a placeholder
    //Picker as RNPicker, // for older RN versions; fallback below
} from "react-native";
import { useRouter } from "expo-router";
import { colors, darkColors, spacing, radii, fontSizes } from "../src/theme";

type Language = "en" | "es" | "fr";
type Contrast = "light" | "dark" | "high";

type Preferences = {
    fontScale: number;
    contrast: Contrast;
    language: Language;
    soundAlerts: boolean;
};

type WelcomeProps = {
    onComplete?: (prefs: Preferences) => void;
};

const DEFAULT_PREFS: Preferences = {
    fontScale: 1,
    contrast: "light",
    language: "en",
    soundAlerts: true,
};

const StepCount = 4;

export default function Welcome({ onComplete }: WelcomeProps) {
    const router = useRouter();
    const [step, setStep] = useState<number>(0); // 0 = intro, 1..4 steps
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

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

    const colorsByContrast = {
        light: { background: colors.background, text: colors.text, muted: "#575757ff", accent: colors.accent },
        dark: { background: darkColors.background, text: darkColors.text, muted: "#f0f3f9ff", accent: darkColors.primary },
        high: { background: "#000000", text: "#FFFF00", muted: "#FFFFAF", accent: colors.warn },
    } as const;

    const currentColors = colorsByContrast[prefs.contrast];

    function updatePrefs<K extends keyof Preferences>(key: K, value: Preferences[K]) {
        setPrefs((p) => ({ ...p, [key]: value }));
    }

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
                <Text style={[styles.title, { color: currentColors.text }]}>{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: currentColors.text }]}>{subtitle}</Text> : null}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            {step === 0 ? (
                <View style={styles.card}>
                    <Text style={[styles.mainTitle, { color: currentColors.text }]}>Let's Get You Set Up!</Text>
                    <Text style={[styles.lead, { color: currentColors.muted }]}>Welcome to AI PEER. We'll help you personalize your experience in just a few simple steps.</Text>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: currentColors.text }]}>What's Next:</Text>
                        <View style={styles.bullet}>
                            <Text style={[styles.bulletTitle, { color: currentColors.text }]}>Choose Your Text Size</Text>
                            <Text style={[styles.bulletText, { color: currentColors.text }]}>Select a comfortable reading size that works best for you</Text>
                        </View>
                        <View style={styles.bullet}>
                            <Text style={[styles.bulletTitle, { color: currentColors.text }]}>Adjust Display Settings</Text>
                            <Text style={[styles.bulletText, { color: currentColors.text }]}>Pick colors and contrast that are easy on your eyes</Text>
                        </View>
                        <View style={styles.bullet}>
                            <Text style={[styles.bulletTitle, { color: currentColors.text }]}>Set Your Preferences</Text>
                            <Text style={[styles.bulletText, { color: currentColors.text }]}>Choose your language and alert options</Text>
                        </View>
                    </View>
                    
                    <Text style={[styles.smallNote, { color: currentColors.text }]}>Don't worry! You can change these settings anytime later on.</Text>
                    <TouchableOpacity
                        accessibilityLabel="Let's Begin"
                        style={[styles.primaryButton, { backgroundColor: currentColors.accent }]}
                        onPress={() => setStep(1)}
                    >
                        <Text style={styles.primaryButtonText}>Let's Begin</Text>
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
                                        style={[styles.sizeOption, prefs.fontScale === 0.85 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 0.85)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: 14 * prefs.fontScale,  color: "#fff" }]}>A</Text>
                                        <Text style={{ color: "#fff" }}>Small</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sizeOption, prefs.fontScale === 1 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 1)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: 18 * prefs.fontScale,  color: "#fff"  }]}>A</Text>
                                        <Text style={{  color: "#fff"  }}>Default</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sizeOption, prefs.fontScale === 1.25 && styles.optionSelected]}
                                        onPress={() => updatePrefs("fontScale", 1.25)}
                                    >
                                        <Text style={[styles.previewLabel, { fontSize: 24 * prefs.fontScale,  color: "#fff"  }]}>A</Text>
                                        <Text style={{ color: "#fff" }}>Large</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.previewBox}>
                                <Text style={{ color: currentColors.text, fontSize: 16 * prefs.fontScale }}>{previewText}</Text>
                                <Text style={{ color: currentColors.text, marginTop: 8, fontSize: 12 * prefs.fontScale }}>Preview adjusts as you change text size.</Text>
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
                                        <Text style={{ color: "#fff", fontSize: 13 }}>Light</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.contrastOption, prefs.contrast === "dark" && styles.optionSelected]}
                                        onPress={() => updatePrefs("contrast", "dark")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 13 }}>Dark</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.contrastOption, prefs.contrast === "high" && styles.optionSelected]}
                                        onPress={() => updatePrefs("contrast", "high")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 12.5 }}>High Contrast</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.previewBox, { backgroundColor: currentColors.background }]}>
                                <Text style={{ color: currentColors.text, fontSize: 16 * prefs.fontScale }}>{previewText}</Text>
                                <Text style={{ color: currentColors.text, marginTop: 8, fontSize: 12 * prefs.fontScale }}>Preview shows your chosen contrast and colors.</Text>
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
                                        <Text style={{ color: "#fff", fontSize: 13.5 }}>English</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.langOption, prefs.language === "es" && styles.optionSelected]}
                                        onPress={() => updatePrefs("language", "es")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 13.5 }}>Español</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.langOption, prefs.language === "fr" && styles.optionSelected]}
                                        onPress={() => updatePrefs("language", "fr")}
                                    >
                                        <Text style={{ color: "#fff", fontSize: 13 }}>Français</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.previewBox}>
                                <Text style={{ color: currentColors.text, fontSize: 16 * prefs.fontScale }}>{previewText}</Text>
                            </View>
                        </View>
                    )}

                    {step === 4 && (
                        <View>
                            <StepHeader title="Sound Alerts" subtitle="Enable or disable alert sounds for notifications" />
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 }}>
                                <Text style={{ color: currentColors.text }}>Sound Alerts</Text>
                                <Switch
                                    value={prefs.soundAlerts}
                                    onValueChange={(v) => updatePrefs("soundAlerts", v)}
                                    trackColor={{ true: currentColors.accent, false: "#ccc" }}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: currentColors.accent }]}
                                onPress={playAlertPreview}
                                accessibilityLabel="Play alert preview"
                            >
                                <Text style={{ color: currentColors.accent }}>Play Alert Preview</Text>
                            </TouchableOpacity>

                            <View style={styles.previewBox}>
                                <Text style={{ color: currentColors.text, fontSize: 16 * prefs.fontScale }}>{previewText}</Text>
                                <Text style={{ color: currentColors.text, marginTop: 8, fontSize: 12 * prefs.fontScale }}>
                                    Toggle sound alerts and play a short preview (uses vibration on device or beep on web).
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Navigation */}
                    <View style={styles.bottomRow}>
                        <TouchableOpacity onPress={goBack} disabled={step === 0} style={[styles.navButton, { opacity: step === 0 ? 0.5 : 1 }]}>
                            <Text style={{ color: currentColors.text }}>Back</Text>
                        </TouchableOpacity>

                        <View style={styles.progressDots}>
                            {Array.from({ length: StepCount }).map((_, i) => {
                                const active = i + 1 === step;
                                return <View key={i} style={[styles.dot, active ? { backgroundColor: currentColors.accent } : { backgroundColor: "#ccc" }]} />;
                            })}
                        </View>

                        <TouchableOpacity
                            onPress={goNext}
                            style={[styles.navButtonPrimary, { backgroundColor: currentColors.accent }]}
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
        marginBottom: 8,
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
    section: {
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: fontSizes.h3,
        textAlign: "center",
        fontWeight: "600",
        marginBottom: spacing(3),
    },
    bullet: {
        marginBottom: 8,
    },
    bulletTitle: {
        fontWeight: "400",
        textAlign: "center",
        textDecorationLine: "underline",
        marginBottom: spacing(1),
    },
    bulletText: {
        fontSize: 12,
        textAlign: "center",
        marginBottom: spacing(2),
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
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.accent,
    },
    optionSelected: {
        backgroundColor: "#575757ff",
    },
    contrastOption: {
        flex: 1,
        alignItems: "center",
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.accent,
    },
    langOption: {
        flex: 1,
        alignItems: "center",
        padding: spacing(3),
        marginHorizontal: spacing(1.5),
        borderRadius: radii.md,
        backgroundColor: colors.accent,
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