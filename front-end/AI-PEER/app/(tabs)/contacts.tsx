import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { scaleFontSizes } from "../../src/theme";
import { usePrefs } from "../../src/prefs-context";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

type ContactTab = "emergency" | "family" | "medical";

type EmergencyContact = { id: string; name: string; phone: string };
type FamilyContact = { id: string; name: string; phone: string; role: string };
type MedicalContact = { id: string; name: string; phone: string; specialty: string };

type ContactsData = {
  emergency: EmergencyContact[];
  family: FamilyContact[];
  medical: MedicalContact[];
};

const FAMILY_ROLES = ["Mother", "Father", "Daughter", "Son", "Husband", "Wife", "Cousin"];

const MEDICAL_SPECIALTIES = [
  "Primary Care", "Cardiology", "Neurology", "Orthopedics", "Psychiatry",
  "Dermatology", "Ophthalmology", "ENT", "Pulmonology", "Gastroenterology",
  "Endocrinology", "Oncology", "Urology", "Nephrology", "Rheumatology",
  "Physical Therapy", "Occupational Therapy",
  "Home Health Nurse", "Social Worker", "Case Manager",
];

const emptyContacts: ContactsData = { emergency: [], family: [], medical: [] };

export default function ContactsScreen() {
  const [tab, setTab] = useState<ContactTab>("emergency");
  const [contacts, setContacts] = useState<ContactsData>(emptyContacts);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { scaled, colors } = usePrefs();
  const { user } = useAuth();

  // Form state for add/edit modal
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const userId = user?.uid;

  // Load contacts from backend
  useEffect(() => {
    if (!userId) { setLoadingData(false); return; }
    (async () => {
      try {
        const res = await api.getUser(userId);
        if (res.user?.contacts) {
          setContacts({
            emergency: res.user.contacts.emergency ?? [],
            family: res.user.contacts.family ?? [],
            medical: res.user.contacts.medical ?? [],
          });
        }
      } catch (e) {
        console.log("[Contacts] Failed to load:", e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [userId]);

  // Persist contacts to backend
  const saveContacts = useCallback(async (updated: ContactsData) => {
    if (!userId) return;
    setContacts(updated);
    try {
      await api.updateUser(userId, { contacts: updated });
    } catch (e) {
      console.log("[Contacts] Failed to save:", e);
    }
  }, [userId]);

  // Open modal to edit an existing contact
  const openEdit = (c: any) => {
    setEditingContactId(c.id);
    setNewName(c.name);
    setNewPhone(c.phone);
    if (tab === "family") setNewLabel(c.role || "");
    else if (tab === "medical") setNewLabel(c.specialty || "");
    setShowAdd(true);
  };

  // Add or update a contact
  const handleSave = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert("Missing Info", "Please enter a name and phone number.");
      return;
    }
    if (tab !== "emergency" && !newLabel) {
      Alert.alert("Missing Info", `Please select a ${tab === "family" ? "role" : "specialty"}.`);
      return;
    }

    setSaving(true);
    const updated = { ...contacts };
    const id = editingContactId || Date.now().toString();

    if (tab === "emergency") {
      const entry = { id, name: newName.trim(), phone: newPhone.trim() };
      if (editingContactId) {
        updated.emergency = updated.emergency.map(c => c.id === id ? entry : c);
      } else {
        updated.emergency = [...updated.emergency, entry];
      }
    } else if (tab === "family") {
      const entry = { id, name: newName.trim(), phone: newPhone.trim(), role: newLabel };
      if (editingContactId) {
        updated.family = updated.family.map(c => c.id === id ? entry : c);
      } else {
        updated.family = [...updated.family, entry];
      }
    } else {
      const entry = { id, name: newName.trim(), phone: newPhone.trim(), specialty: newLabel };
      if (editingContactId) {
        updated.medical = updated.medical.map(c => c.id === id ? entry : c);
      } else {
        updated.medical = [...updated.medical, entry];
      }
    }

    await saveContacts(updated);
    setSaving(false);
    resetForm();
    setShowAdd(false);
  };

  // Delete a contact
  const handleDelete = (contactId: string) => {
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const updated = { ...contacts };
          if (tab === "emergency") updated.emergency = updated.emergency.filter(c => c.id !== contactId);
          else if (tab === "family") updated.family = updated.family.filter(c => c.id !== contactId);
          else updated.medical = updated.medical.filter(c => c.id !== contactId);
          await saveContacts(updated);
        },
      },
    ]);
  };

  const handleCall = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${cleaned}`);
  };

  const resetForm = () => {
    setNewName("");
    setNewPhone("");
    setNewLabel("");
    setShowLabelPicker(false);
    setEditingContactId(null);
  };

  const currentList = tab === "emergency" ? contacts.emergency : tab === "family" ? contacts.family : contacts.medical;

  const title = tab === "emergency" ? "Emergency Contacts" : tab === "family" ? "Family Members" : "Medical Contacts";

  const titleIconName: keyof typeof Ionicons.glyphMap =
    tab === "emergency" ? "warning-outline" : tab === "family" ? "people-outline" : "medkit-outline";

  const titleIconColor = tab === "emergency" ? warmRed : "#5B4636";

  const getSubtitle = (c: any) => {
    if (tab === "emergency") return c.phone;
    if (tab === "family") return c.role || c.phone;
    return c.specialty || c.phone;
  };

  const labelOptions = tab === "family" ? FAMILY_ROLES : MEDICAL_SPECIALTIES;
  const labelPlaceholder = tab === "family" ? "Select role" : "Select specialty";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.headerSubtitle, { fontSize: scaled.h2 / 2, color: colors.muted }]}>Contact Lists</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="moon-outline" size={18} color="#555" />
            <Ionicons name="notifications-outline" size={18} color="#555" />
          </View>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentOuter}>
          <SegmentButton label="Urgent" icon="warning-outline" active={tab === "emergency"} onPress={() => { setTab("emergency"); setEditing(false); }} scaled={scaled} />
          <SegmentButton label="Family" icon="people-outline" active={tab === "family"} onPress={() => { setTab("family"); setEditing(false); }} scaled={scaled} />
          <SegmentButton label="Medical" icon="medkit-outline" active={tab === "medical"} onPress={() => { setTab("medical"); setEditing(false); }} scaled={scaled} />
        </View>

        {/* Main card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={titleIconName} size={18} color={titleIconColor} />
              <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{title}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.headerBtn}>
                <Ionicons name={editing ? "checkmark-outline" : "create-outline"} size={18} color="#5B4636" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }} style={styles.headerBtn}>
                <Ionicons name="add-outline" size={18} color="#5B4636" />
              </TouchableOpacity>
            </View>
          </View>

          {loadingData ? (
            <View style={{ paddingVertical: 30 }}>
              <ActivityIndicator color={warmRed} />
            </View>
          ) : currentList.length === 0 ? (
            <Text style={[styles.emptyText, { fontSize: scaled.small }]}>No contacts yet. Tap + to add one.</Text>
          ) : (
            currentList.map((c: any, index: number) => (
              <View
                key={c.id}
                style={[styles.contactRow, index !== 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#F0E0D4" }]}
              >
                <View style={styles.contactLeft}>
                  <View style={styles.avatar}>
                    <Ionicons name="person-outline" size={18} color="#D97A4A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { fontSize: scaled.h1 / 2 }]}>{c.name}</Text>
                    <Text style={[styles.contactSubtitle, { fontSize: scaled.small }]}>{getSubtitle(c)}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  {editing ? (
                    <>
                      <TouchableOpacity style={styles.editBtn} activeOpacity={0.9} onPress={() => openEdit(c)}>
                        <Ionicons name="create-outline" size={16} color="#5B4636" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.9} onPress={() => handleDelete(c.id)}>
                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.callBtn} activeOpacity={0.9} onPress={() => handleCall(c.phone)}>
                      <Ionicons name="call-outline" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, { fontSize: scaled.h2 }]}>
                {editingContactId ? "Edit" : "Add"} {tab === "emergency" ? "Urgent" : tab === "family" ? "Family" : "Medical"} Contact
              </Text>

              <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>Name</Text>
              <TextInput
                style={[styles.input, { fontSize: scaled.base }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Contact name"
                placeholderTextColor="#999"
              />

              <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { fontSize: scaled.base }]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />

              {tab !== "emergency" && (
                <>
                  <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>
                    {tab === "family" ? "Role" : "Specialty"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: "center" }]}
                    onPress={() => setShowLabelPicker(!showLabelPicker)}
                  >
                    <Text style={{ fontSize: scaled.base, color: newLabel ? "#3F2F25" : "#999" }}>
                      {newLabel || labelPlaceholder}
                    </Text>
                  </TouchableOpacity>

                  {showLabelPicker && (
                    <ScrollView style={styles.pickerList} nestedScrollEnabled>
                      {labelOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.pickerItem, newLabel === opt && { backgroundColor: beigeTile }]}
                          onPress={() => { setNewLabel(opt); setShowLabelPicker(false); }}
                        >
                          <Text style={[styles.pickerItemText, { fontSize: scaled.small }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setShowAdd(false); }}>
                  <Text style={[styles.cancelBtnText, { fontSize: scaled.base }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={[styles.saveBtnText, { fontSize: scaled.base }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* -------- small segmented button component -------- */

function SegmentButton({
  label, icon, active, onPress, scaled,
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
      <Ionicons name={icon} size={14} color={active ? "#FFF" : "#7A6659"} />
      <Text style={[styles.segmentText, active && { color: "#FFF" }, { fontSize: scaled.small }]}>
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
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#3F2F25" },
  headerSubtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: "#7A6659" },

  segmentOuter: {
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
  segmentText: { fontSize: 13, fontWeight: "700", color: "#7A6659" },

  card: {
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1.5 },
    }),
  },
  cardHeaderRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontWeight: "800", fontSize: 14, color: "#3F2F25" },
  headerBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#FFF3E0",
    alignItems: "center", justifyContent: "center",
  },
  emptyText: { textAlign: "center", color: "#7A6659", paddingVertical: 24 },

  contactRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 999,
    backgroundColor: beigeTile,
    alignItems: "center", justifyContent: "center",
  },
  contactName: { fontWeight: "600", fontSize: 14, color: "#3F2F25" },
  contactSubtitle: { marginTop: 2, fontSize: 12, color: "#7A6659" },

  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  editBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#FFF3E0",
    alignItems: "center", justifyContent: "center",
  },
  callBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: warmRed,
    alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#B91C1C",
    alignItems: "center", justifyContent: "center",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontWeight: "800", color: "#3F2F25", marginBottom: 20 },
  fieldLabel: { fontWeight: "600", color: "#5B4636", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E0D5CC",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#3F2F25",
    backgroundColor: "#FDFAF7",
  },
  pickerList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "#E0D5CC",
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: "#FDFAF7",
  },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 14 },
  pickerItemText: { color: "#3F2F25" },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: beigeTile,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "700", color: "#5B4636" },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: warmRed,
    alignItems: "center",
  },
  saveBtnText: { fontWeight: "700", color: "#FFF" },
});
