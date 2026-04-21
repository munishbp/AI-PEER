import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { scaleFontSizes, type ContrastPalette } from "../../src/theme";
import { usePrefs } from "../../src/prefs-context";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";

type ContactTab = "emergency" | "family" | "medical";

type EmergencyContact = { id: string; name: string; phone: string };
type FamilyContact = { id: string; name: string; phone: string; role: string };
type MedicalContact = { id: string; name: string; phone: string; specialty: string };
type AnyContact = EmergencyContact | FamilyContact | MedicalContact;

type ContactsData = {
  emergency: EmergencyContact[];
  family: FamilyContact[];
  medical: MedicalContact[];
};

const FAMILY_ROLES = ["Mother", "Father", "Daughter", "Son", "Husband", "Wife", "Cousin"];

const MEDICAL_SPECIALTIES = [
  "Primary Care",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Dermatology",
  "Ophthalmology",
  "ENT",
  "Pulmonology",
  "Gastroenterology",
  "Endocrinology",
  "Oncology",
  "Urology",
  "Nephrology",
  "Rheumatology",
  "Physical Therapy",
  "Occupational Therapy",
  "Home Health Nurse",
  "Social Worker",
  "Case Manager",
];

const emptyContacts: ContactsData = { emergency: [], family: [], medical: [] };

export default function ContactsScreen() {
  const [tab, setTab] = useState<ContactTab>("emergency");
  const [contacts, setContacts] = useState<ContactsData>(emptyContacts);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, token: authToken } = useAuth();

  const FAMILY_ROLES = t("contacts.familyRoles", { returnObjects: true }) as string[];
  const MEDICAL_SPECIALTIES = t("contacts.medicalSpecialties", { returnObjects: true }) as string[];

  // Form state for add/edit modal
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const userId = user?.uid;

  useEffect(() => {
    if (!userId || !authToken) {
      setLoadingData(false);
      return;
    }

    (async () => {
      try {
        const res = await api.getUser(authToken);
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
  }, [userId, authToken]);

  const saveContacts = useCallback(
    async (updated: ContactsData) => {
      if (!userId || !authToken) return;
      setContacts(updated);
      try {
        await api.updateUser({ contacts: updated }, authToken);
      } catch (e) {
        console.log("[Contacts] Failed to save:", e);
      }
    },
    [userId, authToken]
  );

  const openEdit = (c: AnyContact) => {
    setEditingContactId(c.id);
    setNewName(c.name);
    setNewPhone(c.phone);
    if (tab === "family") setNewLabel((c as FamilyContact).role || "");
    else if (tab === "medical") setNewLabel((c as MedicalContact).specialty || "");
    setShowAdd(true);
  };

  // Add or update a contact
  const labelKey = tab === "family" ? "role" : "specialty";
  const handleSave = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert(t("contacts.missingInfo"), t("contacts.missingInfoDescription"));
      return;
    }
    if (tab !== "emergency" && !newLabel) {
      Alert.alert(t("contacts.missingInfo"), t("contacts.selectLabel", { label: t(`contacts.${labelKey}`) }));
      return;
    }

    setSaving(true);
    const updated = { ...contacts };
    const id = editingContactId || Date.now().toString();

    if (tab === "emergency") {
      const entry = { id, name: newName.trim(), phone: newPhone.trim() };
      updated.emergency = editingContactId
        ? updated.emergency.map((c) => (c.id === id ? entry : c))
        : [...updated.emergency, entry];
    } else if (tab === "family") {
      const entry = { id, name: newName.trim(), phone: newPhone.trim(), role: newLabel };
      updated.family = editingContactId
        ? updated.family.map((c) => (c.id === id ? entry : c))
        : [...updated.family, entry];
    } else {
      const entry = { id, name: newName.trim(), phone: newPhone.trim(), specialty: newLabel };
      updated.medical = editingContactId
        ? updated.medical.map((c) => (c.id === id ? entry : c))
        : [...updated.medical, entry];
    }

    await saveContacts(updated);
    setSaving(false);
    resetForm();
    setShowAdd(false);
  };

  const handleDelete = (contactId: string) => {
    Alert.alert(t("contacts.deleteContact"), t("contacts.deleteContactDescription"), [
      { text: t("contacts.cancel"), style: "cancel" },
      {
        text: t("contacts.delete"),
        style: "destructive",
        onPress: async () => {
          const updated = { ...contacts };
          if (tab === "emergency") updated.emergency = updated.emergency.filter((c) => c.id !== contactId);
          else if (tab === "family") updated.family = updated.family.filter((c) => c.id !== contactId);
          else updated.medical = updated.medical.filter((c) => c.id !== contactId);
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

  const title = tab === "emergency" ? t("contacts.emergencyContacts") : tab === "family" ? t("contacts.familyMembers") : t("contacts.medicalContacts");

  const titleIconName: keyof typeof Ionicons.glyphMap =
    tab === "emergency" ? "warning-outline" : tab === "family" ? "people-outline" : "medkit-outline";

  const getSubtitle = (c: AnyContact) => {
    if (tab === "emergency") return c.phone;
    if (tab === "family") return (c as FamilyContact).role || c.phone;
    return (c as MedicalContact).specialty || c.phone;
  };

  const labelOptions = tab === "family" ? FAMILY_ROLES : MEDICAL_SPECIALTIES;
  const labelPlaceholder = tab === "family" ? t("contacts.selectRole") : t("contacts.selectSpecialty");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.headerSubtitle, { fontSize: scaled.h2 / 2, color: colors.muted }]}>{t("contacts.contactLists")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.segmentOuter}>
          <SegmentButton
            label={t("contacts.urgent")}
            icon="warning-outline"
            active={tab === "emergency"}
            onPress={() => {
              setTab("emergency");
              setEditing(false);
            }}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
          <SegmentButton
            label={t("contacts.family")}
            icon="people-outline"
            active={tab === "family"}
            onPress={() => {
              setTab("family");
              setEditing(false);
            }}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
          <SegmentButton
            label={t("contacts.medical")}
            icon="medkit-outline"
            active={tab === "medical"}
            onPress={() => {
              setTab("medical");
              setEditing(false);
            }}
            scaled={scaled}
            styles={styles}
            colors={colors}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name={titleIconName} size={18} color={colors.accent} />
              <Text style={[styles.cardTitle, { fontSize: scaled.base }]}>{title}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.headerBtn}>
                <Ionicons name={editing ? "checkmark-outline" : "create-outline"} size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowAdd(true);
                }}
                style={styles.headerBtn}
              >
                <Ionicons name="add-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {loadingData ? (
            <View style={{ paddingVertical: 30 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : currentList.length === 0 ? (
            <Text style={[styles.emptyText, { fontSize: scaled.small }]}>{t("contacts.noContacts")}</Text>
          ) : (
            currentList.map((c, index) => (
              <View
                key={c.id}
                style={[
                  styles.contactRow,
                  index !== 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.background,
                  },
                ]}
              >
                <View style={styles.contactLeft}>
                  <View style={styles.avatar}>
                    <Ionicons name="person-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { fontSize: scaled.h1/2}]}>{c.name}</Text>
                    <Text style={[styles.contactSubtitle, { fontSize: scaled.small }]}>{getSubtitle(c)}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  {editing ? (
                    <>
                      <TouchableOpacity style={styles.editBtn} activeOpacity={0.9} onPress={() => openEdit(c)}>
                        <Ionicons name="create-outline" size={16} color={colors.text} />
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

      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { fontSize: scaled.h2 }]}>
                  {editingContactId ? t("contacts.edit") : t("contacts.add")} {tab === "emergency" ? t("contacts.urgent") : tab === "family" ? t("contacts.family") : t("contacts.medical")} {t("contacts.contact")}
                </Text>

                <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>{t("contacts.name")}</Text>
                <TextInput
                  style={[styles.input, { fontSize: scaled.base }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t("contacts.contactNamePlaceholder")}
                  placeholderTextColor={colors.muted}
                />

                <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>{t("contacts.phoneNumber")}</Text>
                <TextInput
                  style={[styles.input, { fontSize: scaled.base }]}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                />

                {tab !== "emergency" && (
                  <>
                    <Text style={[styles.fieldLabel, { fontSize: scaled.small }]}>
                      {tab === "family" ? t("contacts.role") : t("contacts.specialty")}
                    </Text>
                    <TouchableOpacity style={[styles.input, { justifyContent: "center" }]} onPress={() => setShowLabelPicker(!showLabelPicker)}>
                      <Text style={{ fontSize: scaled.base, color: newLabel ? colors.text : colors.muted }}>
                        {newLabel || labelPlaceholder}
                      </Text>
                    </TouchableOpacity>

                    {showLabelPicker && (
                      <ScrollView style={styles.pickerList} nestedScrollEnabled>
                        {labelOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.pickerItem, newLabel === opt && { backgroundColor: colors.background }]}
                            onPress={() => {
                              setNewLabel(opt);
                              setShowLabelPicker(false);
                            }}
                          >
                            <Text style={[styles.pickerItemText, { fontSize: scaled.small }]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      resetForm();
                      setShowAdd(false);
                    }}
                  >
                    <Text style={[styles.cancelBtnText, { fontSize: scaled.base }]}>{t("contacts.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={[styles.saveBtnText, { fontSize: scaled.base }]}>{t("contacts.save")}</Text>
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
      <Text style={[styles.segmentText, active && { color: "#FFF" }, { fontSize: scaled.small }]}>{label}</Text>
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
    headerSubtitle: { marginTop: 3, marginBottom: 6, fontSize: 11, color: colors.muted },

    segmentOuter: {
      backgroundColor: colors.bgTile,
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
    segmentText: { fontSize: 13, fontWeight: "700", color: colors.muted },

    card: {
      marginTop: 10,
      backgroundColor: colors.bgTile,
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
    cardTitle: { fontWeight: "800", fontSize: 14, color: colors.text },
    headerBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: { textAlign: "center", color: colors.muted, paddingVertical: 24 },

    contactRow: {
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    contactLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    contactName: { fontWeight: "600", fontSize: 14, color: colors.text },
    contactSubtitle: { marginTop: 2, fontSize: 12, color: colors.muted },

    actions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
    editBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    callBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.bgTile,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: { fontWeight: "800", color: colors.text, marginBottom: 20 },
    fieldLabel: { fontWeight: "600", color: colors.text, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.background,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    pickerList: {
      maxHeight: 180,
      borderWidth: 1,
      borderColor: colors.background,
      borderRadius: 10,
      marginTop: 4,
      backgroundColor: colors.background,
    },
    pickerItem: { paddingVertical: 10, paddingHorizontal: 14 },
    pickerItemText: { color: colors.text },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: "center",
    },
    cancelBtnText: { fontWeight: "700", color: colors.text },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveBtnText: { fontWeight: "700", color: "#FFF" },
  });
