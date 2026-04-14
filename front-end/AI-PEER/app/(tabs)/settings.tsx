// app/(tabs)/settings.tsx
import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  Vibration,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { scaleFontSizes } from "../../src/theme";
import type { Prefs } from "../../src/prefs-context";
import { usePrefs } from "../../src/prefs-context";
import { useAuth } from "../../src/auth";
import { type ContrastPalette } from "../../src/theme";

type SettingsTab = "accessibility" | "notifications";

type Reminder = {
  id: string;
  title: string;
  time?: string;
  enabled: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("accessibility");
  const { prefs, updatePrefs, scaled, colors } = usePrefs();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logout } = useAuth();

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", title: "Morning walk", time: "8:00 AM", enabled: true },
    { id: "2", title: "Take meds", time: "9:00 PM", enabled: true },
  ]);

  function addReminder(title: string, time?: string) {
    const id = Date.now().toString();
    setReminders((r) => [{ id, title, time, enabled: true }, ...r]);
  }

  function deleteReminder(id: string) {
    setReminders((r) => r.filter((x) => x.id !== id));
  }

  function toggleReminder(id: string) {
    setReminders((r) => r.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  }

  function playAlertPreview() {
    if (!prefs.soundAlerts) return;

    if (Platform.OS !== "web" && Vibration) {
      Vibration.vibrate(120);
      return;
    }

    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
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

  function handleLogout() {
    const LOGIN_ROUTE = "../login";

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            const mod = await import("@react-native-async-storage/async-storage");
            await mod.default.removeItem("token");
            await mod.default.removeItem("user");
          } catch {
            // no-op
          }

          router.replace(LOGIN_ROUTE);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2 / 2 }]}>Settings & Preferences</Text>
            </View>
          </View>
          <Ionicons name="settings-outline" size={18} color={colors.muted} />
        </View>

        <View style={styles.segmentOuter}>
          <SegmentButton
            label="Access"
            icon="accessibility-outline"
            active={tab === "accessibility"}
            onPress={() => setTab("accessibility")}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
          <SegmentButton
            label="Alerts"
            icon="alarm-outline"
            active={tab === "notifications"}
            onPress={() => setTab("notifications")}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
        </View>

        {tab === "accessibility" && (
          <AccessibilityTab
            prefs={prefs}
            updatePrefs={updatePrefs}
            playAlert={playAlertPreview}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
        )}

        {tab === "notifications" && (
          <NotificationsTab
            reminders={reminders}
            addReminder={addReminder}
            deleteReminder={deleteReminder}
            toggleReminder={toggleReminder}
            onLogout={handleLogout}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessibilityTab({
  prefs,
  updatePrefs,
  playAlert,
  scaled,
  styles,
  colors,
}: {
  prefs: Prefs;
  updatePrefs: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  playAlert: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
  styles: ReturnType<typeof createStyles>;
  colors: ContrastPalette;
}) {
  const fontSizesLabels = ["Small (90%)", "Normal (100%)", "Large (120%)"];
  const contrastOptions = ["Light", "Dark", "High Contrast"];
  const languages = ["English", "Spanish", "French"];

  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="text-outline" size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Text Size</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base * 0.75 }]}>Choose a comfortable reading size</Text>
        <View style={styles.optionsRow}>
          {fontSizesLabels.map((size, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => updatePrefs("fontScale", 0.9 + i * 0.1)}
              style={[
                styles.optionButton,
                prefs.fontScale === 0.9 + i * 0.1 && styles.optionButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  prefs.fontScale === 0.9 + i * 0.1 && styles.optionButtonTextActive,
                  { fontSize: scaled.base * 0.75 },
                ]}
              >
                {size.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="contrast-outline" size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Display Contrast</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base * 0.75 }]}>Choose colors that are easy on your eyes</Text>
        <View style={styles.optionsRow}>
          {(["light", "dark", "high"] as const).map((contrast, i) => (
            <TouchableOpacity
              key={contrast}
              onPress={() => updatePrefs("contrast", contrast)}
              style={[
                styles.optionButton,
                prefs.contrast === contrast && styles.optionButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  prefs.contrast === contrast && styles.optionButtonTextActive,
                  { fontSize: scaled.base * 0.75 },
                ]}
              >
                {contrastOptions[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="globe-outline" size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Language</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base * 0.75 }]}>Select your preferred language</Text>
        <View style={styles.optionsRow}>
          {(["en", "es", "fr"] as const).map((lang, i) => (
            <TouchableOpacity
              key={lang}
              onPress={() => updatePrefs("language", lang)}
              style={[
                styles.optionButton,
                prefs.language === lang && styles.optionButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  prefs.language === lang && styles.optionButtonTextActive,
                  { fontSize: scaled.base * 0.75 },
                ]}
              >
                {languages[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="volume-high-outline" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Sound Alerts</Text>
            </View>
            <Text style={[styles.settingDescription, { fontSize: scaled.base * 0.75 }]}>Enable notification sounds</Text>
          </View>
          <Switch
            value={prefs.soundAlerts}
            onValueChange={(v) => updatePrefs("soundAlerts", v)}
            trackColor={{ true: colors.accent, false: colors.background }}
          />
        </View>

        {prefs.soundAlerts && (
          <TouchableOpacity style={styles.secondaryButton} onPress={playAlert} activeOpacity={0.85}>
            <Ionicons name="play-outline" size={14} color={colors.accent} />
            <Text style={[styles.secondaryButtonText, { color: colors.accent, fontSize: scaled.small }]}>Play Preview</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

function NotificationsTab({
  reminders,
  addReminder,
  deleteReminder,
  toggleReminder,
  onLogout,
  scaled,
  styles,
  colors,
}: {
  reminders: Reminder[];
  addReminder: (title: string, time?: string) => void;
  deleteReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  onLogout: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
  styles: ReturnType<typeof createStyles>;
  colors: ContrastPalette;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  function handleAdd() {
    if (!title.trim()) return;
    addReminder(title.trim(), time.trim() || undefined);
    setTitle("");
    setTime("");
  }

  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="alarm-outline" size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Reminders</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base * 0.75 }]}>Create and manage personal reminders</Text>

        {reminders.map((rem) => (
          <View key={rem.id} style={styles.notificationRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notificationLabel, { fontSize: scaled.small }]}>{rem.title}</Text>
                <Text style={[styles.notificationDescription, { fontSize: scaled.h2 / 2 }]}>{rem.time || ""}</Text>
              </View>
              <Switch
                value={rem.enabled}
                onValueChange={() => toggleReminder(rem.id)}
                trackColor={{ true: colors.accent, false: colors.background }}
              />
              <TouchableOpacity onPress={() => deleteReminder(rem.id)} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Reminder title"
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { fontSize: scaled.small }]}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            placeholder="Time (optional)"
            value={time}
            onChangeText={setTime}
            style={[styles.input, { fontSize: scaled.small, width: 110 }]}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity style={[styles.primaryButton, { paddingHorizontal: 12 }]} onPress={handleAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={[styles.primaryButtonText, { fontSize: scaled.small }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: scaled.base, marginBottom: 8 }]}>Account</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={[styles.logoutButtonText, { fontSize: scaled.small }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function SegmentButton({
  label,
  icon,
  active,
  onPress,
  scaled,
  styles,
  colors,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
  styles: ReturnType<typeof createStyles>;
  colors: ContrastPalette;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.segmentBtn, active && { backgroundColor: colors.accent }]}
    >
      <Ionicons name={icon} size={14} color={active ? "#FFF" : colors.muted} />
      <Text style={[styles.segmentText, active && { color: "#FFF" }, { fontSize: scaled.small }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ContrastPalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

    header: {
      paddingTop: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: colors.text },
    subtitle: { marginTop: 3, marginBottom: 6, color: colors.muted, fontSize: 13 },

    segmentOuter: {
      backgroundColor: colors.bgTile,
      borderRadius: 999,
      padding: 4,
      flexDirection: "row",
      gap: 6,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    segmentText: { fontWeight: "700", color: colors.muted, fontSize: 13 },

    card: {
      backgroundColor: colors.bgTile,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
      ...Platform.select({
        ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 1.5 },
      }),
    },
    cardTitle: { fontWeight: "800", fontSize: 14, color: colors.text },
    settingDescription: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 12 },

    optionsRow: { flexDirection: "row", gap: 8 },
    optionButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    optionButtonActive: {
      backgroundColor: colors.accent,
    },
    optionButtonText: { fontWeight: "600", color: colors.text, fontSize: 12, textAlign: "center" },
    optionButtonTextActive: { color: "#FFF" },

    secondaryButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.background,
    },
    secondaryButtonText: { fontWeight: "700", fontSize: 12 },

    notificationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.background,
    },
    notificationLabel: { fontWeight: "700", color: colors.text, fontSize: 13 },
    notificationDescription: { fontSize: 11, color: colors.muted, marginTop: 2 },

    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    primaryButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      color: colors.text,
    },

    logoutButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    logoutButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  });
