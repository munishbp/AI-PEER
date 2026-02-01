import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { scaleFontSizes } from "../../src/theme";
import { usePrefs } from "../../src/prefs-context";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

type ContactTab = "emergency" | "family" | "medical";

type Contact = {
  id: string;
  name: string;
  subtitle: string; // phone, relationship, etc.
};

const EMERGENCY: Contact[] = [
  { id: "1", name: "Sarah Johnson", subtitle: "+1 (555) 123-4567" },
  { id: "2", name: "Maria Rodriguez", subtitle: "+1 (555) 456-7890" },
];

const FAMILY: Contact[] = [
  { id: "1", name: "Sarah Johnson", subtitle: "family" },
  { id: "2", name: "Tom Wilson", subtitle: "neighbor" },
];

const MEDICAL: Contact[] = [
  { id: "1", name: "Dr. Smith", subtitle: "Primary physician" },
  { id: "2", name: "Local Clinic", subtitle: "+1 (555) 987-6543" },
];

export default function ContactsScreen() {
  const [tab, setTab] = useState<ContactTab>("emergency");
  const { scaled, colors } = usePrefs();

  const currentList =
    tab === "emergency" ? EMERGENCY : tab === "family" ? FAMILY : MEDICAL;

  const title =
    tab === "emergency"
      ? "Emergency Contacts"
      : tab === "family"
      ? "Family Members"
      : "Medical Contacts";

  const titleIconName: keyof typeof Ionicons.glyphMap =
    tab === "emergency"
      ? "warning-outline"
      : tab === "family"
      ? "people-outline"
      : "medkit-outline";

  const titleIconColor = tab === "emergency" ? warmRed : "#5B4636";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header like other screens */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.headerSubtitle, { fontSize: scaled.h2/2, color: colors.muted }]}>Contact Lists</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="moon-outline" size={18} color="#555" />
            <Ionicons name="notifications-outline" size={18} color="#555" />
          </View>
        </View>

        {/* Segmented control: Emergency | Family | Medical */}
        <View style={styles.segmentOuter}>
          <SegmentButton
            label="Urgent"
            icon="warning-outline"
            active={tab === "emergency"}
            onPress={() => setTab("emergency")}
            scaled={scaled}
          />
          <SegmentButton
            label="Family"
            icon="people-outline"
            active={tab === "family"}
            onPress={() => setTab("family")}
            scaled={scaled}
          />
          <SegmentButton
            label="Medical"
            icon="medkit-outline"
            active={tab === "medical"}
            onPress={() => setTab("medical")}
            scaled={scaled}
          />
        </View>

        {/* Main card with contacts */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={titleIconName} size={18} color={titleIconColor} />
              <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{title}</Text>
            </View>
          </View>

          {currentList.map((c, index) => (
            <View
              key={c.id}
              style={[
                styles.contactRow,
                index !== 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#F0E0D4" },
              ]}
            >
              {/* Left side: avatar + text */}
              <View style={styles.contactLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={18} color="#D97A4A" />
                </View>
                <View>
                  <Text style={[styles.contactName, { fontSize: scaled.h1/2 }]}>{c.name}</Text>
                  <Text style={[styles.contactSubtitle, { fontSize: scaled.small }]}>{c.subtitle}</Text>
                </View>
              </View>

              {/* Right side: edit + call buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  activeOpacity={0.9}
                  onPress={() => {}}
                >
                  <Ionicons name="create-outline" size={16} color="#5B4636" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callBtn}
                  activeOpacity={0.9}
                  onPress={() => {}}
                >
                  <Ionicons name="call-outline" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------- small segmented button component -------- */

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
      style={[
        styles.segmentBtn,
        active && { backgroundColor: warmRed },
      ]}
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

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },

  header: {
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 16, fontWeight: "800", color: "#3F2F25" },
  headerSubtitle: { fontSize: 11, color: "#7A6659" },

  segmentOuter: {
    marginTop: 8,
    backgroundColor: beigeTile,
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A6659",
  },

  card: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardHeaderRow: {
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: "#3F2F25",
  },

  contactRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#3F2F25",
  },
  contactSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#7A6659",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: warmRed,
    alignItems: "center",
    justifyContent: "center",
  },
});
