// app/(tabs)/settings.tsx
import { useState } from "react";
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

type SettingsTab = "accessibility" | "devices" | "notifications";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

export default function SettingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("accessibility");
  const { prefs, updatePrefs, scaled, colors } = usePrefs();
  const [reminders, setReminders] = useState<Array<{ id: string; title: string; time?: string; enabled: boolean }>>([
    { id: "1", title: "Morning walk", time: "8:00 AM", enabled: true },
    { id: "2", title: "Take meds", time: "9:00 PM", enabled: true },
  ]);

  // Mock connected devices
  const devices = [
    {
      id: "1",
      name: "Smartwatch",
      type: "watch",
      connected: true,
      battery: 85,
      lastSync: "2 minutes ago",
    },
    {
      id: "2",
      name: "Heart Rate Monitor",
      type: "sensor",
      connected: true,
      battery: 60,
      lastSync: "5 minutes ago",
    },
    {
      id: "3",
      name: "Fitness Band",
      type: "band",
      connected: false,
      battery: null,
      lastSync: "2 days ago",
    },
  ];

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
    // Change this if your login route is not app/index.tsx
    const LOGIN_ROUTE = "/";

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const mod = await import("@react-native-async-storage/async-storage");
            await mod.default.removeItem("token");
            await mod.default.removeItem("user");
          } catch {
            // no-op (no backend/auth yet)
          }

          // Prevent back-navigation into tabs
          router.replace(LOGIN_ROUTE);
        },
      },
    ]);
  }


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC"/>
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2/2 }]}>Settings & Preferences</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="settings-outline" size={18} color="#555" />
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentOuter}>
          <SegmentButton
            label="Access"
            icon="accessibility-outline"
            active={tab === "accessibility"}
            onPress={() => setTab("accessibility")}
            scaled={scaled}
          />
          <SegmentButton
            label="Devices"
            icon="bluetooth-outline"
            active={tab === "devices"}
            onPress={() => setTab("devices")}
            scaled={scaled}
          />
          <SegmentButton
            label="Alerts"
            icon="alarm-outline"
            active={tab === "notifications"}
            onPress={() => setTab("notifications")}
            scaled={scaled}
          />
        </View>

        {/* Tab Content */}
        {tab === "accessibility" && (
          <AccessibilityTab prefs={prefs} updatePrefs={updatePrefs} playAlert={playAlertPreview} scaled={scaled} />
        )}
        {tab === "devices" && <DevicesTab devices={devices} scaled={scaled}/>}
        {tab === "notifications" && (
          <NotificationsTab
            reminders={reminders}
            addReminder={addReminder}
            deleteReminder={deleteReminder}
            toggleReminder={toggleReminder}
            onLogout={handleLogout}
            scaled={scaled}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== ACCESSIBILITY TAB ===================== */

function AccessibilityTab({
  prefs,
  updatePrefs,
  playAlert,
  scaled,
}: {
  prefs: Prefs;
  updatePrefs: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  playAlert: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
}) {
  const fontSizesLabels = ["Small (90%)", "Normal (100%)", "Large (120%)"];
  const contrastOptions = ["Light", "Dark", "High Contrast"];
  const languages = ["English", "Español", "Français"];

  return (
    <>
      {/* Font Scale */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="text-outline" size={16} color={warmRed} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Text Size</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>
          Choose a comfortable reading size
        </Text>
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
                    { fontSize: scaled.base*0.75 },
                  ]}
                >
                  {size.split(" ")[0]}
                </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contrast */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="contrast-outline" size={16} color={warmRed} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Display Contrast</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>
          Choose colors that are easy on your eyes
        </Text>
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
                  { fontSize: scaled.base*0.75 },
                ]}>
                  {contrastOptions[i]}
                </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="globe-outline" size={16} color={warmRed} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Language</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>Select your preferred language</Text>
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
                  { fontSize: scaled.base*0.75 },
              ]}
              >
                {languages[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sound Alerts */}
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
              <Ionicons name="volume-high-outline" size={16} color={warmRed} />
              <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Sound Alerts</Text>
            </View>
            <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>
              Enable notification sounds
            </Text>
          </View>
          <Switch
            value={prefs.soundAlerts}
            onValueChange={(v) => updatePrefs("soundAlerts", v)}
            trackColor={{ true: warmRed, false: "#ccc" }}
          />
        </View>
        {prefs.soundAlerts && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={playAlert}
            activeOpacity={0.85}
          >
            <Ionicons name="play-outline" size={14} color={warmRed} />
            <Text style={[styles.secondaryButtonText, { color: warmRed, fontSize: scaled.small }]}> 
              Play Preview
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

/* ===================== DEVICES TAB ===================== */

function DevicesTab({ devices, scaled }: { devices: any[]; scaled: ReturnType<typeof scaleFontSizes>; }) {
  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="bluetooth-outline" size={16} color={warmRed} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Connected Devices</Text>
        </View>
        <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>
          Manage your paired health devices
        </Text>

        {devices.map((device) => (
          <View key={device.id} style={styles.deviceRow}>
            <View style={styles.deviceIconWrapper}>
              <Ionicons
                name={
                  device.type === "watch"
                    ? "watch-outline"
                    : device.type === "sensor"
                      ? "pulse-outline"
                      : "body-outline"
                }
                size={18}
                color={device.connected ? "#3BAA56" : "#999"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceName, { fontSize: scaled.small }]}>{device.name}</Text>
              <Text style={[styles.deviceStatus, { fontSize: scaled.h2/2 }]}> 
                {device.connected ? (
                  <>
                    <Ionicons name="checkmark-circle" size={12} color="#3BAA56" />
                    {" Connected • "}
                    {device.battery}%
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={12}
                      color="#999"
                    />
                    {" Disconnected"}
                  </>
                )}
              </Text>
              <Text style={[styles.deviceSync, { fontSize: scaled.h2/2 }]}>Last sync: {device.lastSync}</Text>
            </View>
            <TouchableOpacity style={styles.deviceButton}>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={[styles.primaryButtonText, { fontSize: scaled.small }]}>Add New Device</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ===================== NOTIFICATIONS TAB ===================== */

function NotificationsTab({
  reminders,
  addReminder,
  deleteReminder,
  toggleReminder,
  onLogout,
  scaled,
}: {
  reminders: Array<{ id: string; title: string; time?: string; enabled: boolean }>;
  addReminder: (title: string, time?: string) => void;
  deleteReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  onLogout: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
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
          <Ionicons name="alarm-outline" size={16} color={warmRed} />
          <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>Reminders</Text>
          </View>
          <Text style={[styles.settingDescription, { fontSize: scaled.base*0.75 }]}>
            Create and manage personal reminders
          </Text>

        {reminders.map((rem) => (
          <View key={rem.id} style={styles.notificationRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={16} color={warmRed} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notificationLabel, { fontSize: scaled.small }]}>{rem.title}</Text>
                <Text style={[styles.notificationDescription, { fontSize: scaled.h2/2 }]}>{rem.time || ""}</Text>
              </View>
            <Switch
              value={rem.enabled}
              onValueChange={() => toggleReminder(rem.id)}
              trackColor={{ true: warmRed, false: "#ccc" }}
            />
            <TouchableOpacity onPress={() => deleteReminder(rem.id)} style={{ marginLeft: 8 }}>
              <Ionicons name="trash-outline" size={16} color="#C0392B" />
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
          />
          <TextInput
            placeholder="Time (optional)"
            value={time}
            onChangeText={setTime}
            style={[styles.input, { fontSize: scaled.small, width: 110 }]}
          />
          <TouchableOpacity style={[styles.primaryButton, { paddingHorizontal: 12 }]} onPress={handleAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={[styles.primaryButtonText, { fontSize: scaled.small }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: scaled.base, marginBottom: 8 }]}>Account</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={[styles.logoutButtonText, { fontSize: scaled.small }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ===================== SEGMENT BUTTON ===================== */

function SegmentButton({
  label,
  icon,
  active,
  onPress,
  scaled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  scaled: ReturnType<typeof scaleFontSizes>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.segmentBtn, active && { backgroundColor: warmRed }]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? "#FFF" : "#7A6659"}
      />
      <Text
        style={[
          styles.segmentText,
          active && { color: "#FFF" },
          { fontSize: scaled.small },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: "#6B5E55" },

  segmentOuter: {
    backgroundColor: "#F4E3D6",
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
  segmentText: { fontWeight: "700", color: "#7A6659", fontSize: 13 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "800", fontSize: 14, color: "#3F2F25" },
  settingDescription: { fontSize: 12, color: "#7A6659", marginTop: 4, marginBottom: 12 },

  optionsRow: { flexDirection: "row", gap: 8 },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },
  optionButtonActive: {
    backgroundColor: warmRed,
  },
  optionButtonText: { fontWeight: "600", color: "#5B4636", fontSize: 12, textAlign: "center" },
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
    backgroundColor: beigeTile,
  },
  secondaryButtonText: { fontWeight: "700", fontSize: 12 },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  deviceIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontWeight: "700", color: "#3F2F25", fontSize: 13 },
  deviceStatus: { fontSize: 11, color: "#5B4636", marginTop: 2 },
  deviceSync: { fontSize: 10, color: "#999", marginTop: 1 },
  deviceButton: { padding: 8 },

  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  notificationLabel: { fontWeight: "700", color: "#3F2F25", fontSize: 13 },
  notificationDescription: { fontSize: 11, color: "#7A6659", marginTop: 2 },

  primaryButton: {
    backgroundColor: warmRed,
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
    backgroundColor: beigeTile,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  logoutButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  logoutButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});
