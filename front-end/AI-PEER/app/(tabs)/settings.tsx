// app/(tabs)/settings.tsx
import React, { useState, useMemo } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type SettingsTab = "accessibility" | "devices" | "notifications";
type Language = "en" | "es" | "fr";
type Contrast = "light" | "dark" | "high";

type AccessibilityPrefs = {
  fontScale: number;
  contrast: Contrast;
  language: Language;
  soundAlerts: boolean;
};

const DEFAULT_PREFS: AccessibilityPrefs = {
  fontScale: 1,
  contrast: "light",
  language: "en",
  soundAlerts: true,
};

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

export default function SettingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("accessibility");
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [notifications, setNotifications] = useState({
    activityAlerts: true,
    fallRiskAlerts: true,
    weeklyReport: true,
    deviceNotifications: true,
  });

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

  function updatePrefs<K extends keyof AccessibilityPrefs>(
    key: K,
    value: AccessibilityPrefs[K]
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function toggleNotification<K extends keyof typeof notifications>(key: K) {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC"/>
            <View>
              <Text style={styles.brand}>AI PEER</Text>
              <Text style={styles.subtitle}>Settings & Preferences</Text>
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
          />
          <SegmentButton
            label="Devices"
            icon="bluetooth-outline"
            active={tab === "devices"}
            onPress={() => setTab("devices")}
          />
          <SegmentButton
            label="Alerts"
            icon="notifications-outline"
            active={tab === "notifications"}
            onPress={() => setTab("notifications")}
          />
        </View>

        {/* Tab Content */}
        {tab === "accessibility" && (
          <AccessibilityTab prefs={prefs} updatePrefs={updatePrefs} playAlert={playAlertPreview} />
        )}
        {tab === "devices" && <DevicesTab devices={devices} />}
        {tab === "notifications" && (
          <NotificationsTab
            notifications={notifications}
            toggleNotification={toggleNotification}
            onLogout={handleLogout}
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
}: {
  prefs: AccessibilityPrefs;
  updatePrefs: <K extends keyof AccessibilityPrefs>(
    key: K,
    value: AccessibilityPrefs[K]
  ) => void;
  playAlert: () => void;
}) {
  const fontSizes = ["Small (90%)", "Normal (100%)", "Large (120%)"];
  const contrastOptions = ["Light", "Dark", "High Contrast"];
  const languages = ["English", "Español", "Français"];

  return (
    <>
      {/* Font Scale */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="text-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Text Size</Text>
        </View>
        <Text style={styles.settingDescription}>
          Choose a comfortable reading size
        </Text>
        <View style={styles.optionsRow}>
          {fontSizes.map((size, i) => (
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
                  prefs.fontScale === 0.9 + i * 0.1 &&
                    styles.optionButtonTextActive,
                  { fontSize: 12 + i * 1.5 },
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
          <Text style={styles.cardTitle}>Display Contrast</Text>
        </View>
        <Text style={styles.settingDescription}>
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
                ]}
              >
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
          <Text style={styles.cardTitle}>Language</Text>
        </View>
        <Text style={styles.settingDescription}>Select your preferred language</Text>
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
              <Text style={styles.cardTitle}>Sound Alerts</Text>
            </View>
            <Text style={styles.settingDescription}>
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
            <Text style={[styles.secondaryButtonText, { color: warmRed }]}>
              Play Preview
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

/* ===================== DEVICES TAB ===================== */

function DevicesTab({ devices }: { devices: any[] }) {
  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="bluetooth-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Connected Devices</Text>
        </View>
        <Text style={styles.settingDescription}>
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
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceStatus}>
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
              <Text style={styles.deviceSync}>Last sync: {device.lastSync}</Text>
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
          <Text style={styles.primaryButtonText}>Add New Device</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ===================== NOTIFICATIONS TAB ===================== */

function NotificationsTab({
  notifications,
  toggleNotification,
  onLogout,
}: {
  notifications: any;
  toggleNotification: (key: any) => void;
  onLogout: () => void;
}) {
  const notificationOptions = [
    {
      key: "activityAlerts",
      icon: "pulse-outline",
      label: "Activity Alerts",
      description: "Get notified about activity milestones",
    },
    {
      key: "fallRiskAlerts",
      icon: "shield-checkmark-outline",
      label: "Fall Risk Alerts",
      description: "Critical fall risk notifications",
    },
    {
      key: "weeklyReport",
      icon: "stats-chart-outline",
      label: "Weekly Report",
      description: "Receive your weekly activity summary",
    },
    {
      key: "deviceNotifications",
      icon: "bluetooth-outline",
      label: "Device Updates",
      description: "Device sync and battery alerts",
    },
  ];

  return (
    <>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="notifications-outline" size={16} color={warmRed} />
          <Text style={styles.cardTitle}>Notification Preferences</Text>
        </View>
        <Text style={styles.settingDescription}>
          Control what notifications you receive
        </Text>

        {notificationOptions.map((option) => (
          <View key={option.key} style={styles.notificationRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
                name={option.icon as any}
                size={16}
                color={warmRed}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationLabel}>{option.label}</Text>
                <Text style={styles.notificationDescription}>
                  {option.description}
                </Text>
              </View>
            <Switch
              value={notifications[option.key]}
              onValueChange={() => toggleNotification(option.key)}
              trackColor={{ true: warmRed, false: "#ccc" }}
            />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Account</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
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
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
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
  optionButtonText: { fontWeight: "600", color: "#5B4636", fontSize: 12 },
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
