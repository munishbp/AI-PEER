import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { scaleFontSizes } from "../../src/theme";
import { usePrefs } from "../../src/prefs-context";
import { useAuth } from "../../src/auth";
import { api } from "../../src/api";
import FRAMatrixCard from "../../components/FRAMatrixCard";
import { getQuestionnaireResult } from "../../src/fra-storage";

export default function Home() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();
  const { user, token: authToken } = useAuth();
  const [fesI, setFesI] = useState<number | null>(null);
  const [btrackScore, setBtrackScore] = useState<number | null>(null);

  const userId = user?.uid;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        try {
          const latest = await getQuestionnaireResult();
          if (isMounted) setFesI(latest?.fesI ?? null);
        } catch {
          if (isMounted) setFesI(null);
        }

        // Load btrack score from backend
        if (userId && authToken) {
          try {
            const res = await api.getUser(userId, authToken);
            if (isMounted && typeof res.user?.btrack_score === "number") {
              setBtrackScore(res.user.btrack_score);
            }
          } catch (e) {
            console.log("[Home] Failed to load user:", e);
          }
        }
      })();

      return () => {
        isMounted = false;
      };
    }, [userId, authToken])
  );

  const handleBtrackUpdate = async (newScore: number) => {
    console.log('[Home] BTrack update called with:', newScore);
    setBtrackScore(newScore);
    if (userId && authToken) {
      try {
        await api.updateUser(userId, { btrack_score: newScore }, authToken);
      } catch (e) {
        console.log("[Home] Failed to save btrack:", e);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: tabBarHeight + insets.bottom + 32 },
        ]}
        scrollIndicatorInsets={{ bottom: tabBarHeight + insets.bottom + 32 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#2E5AAC" />
            <View>
              <Text style={[styles.brand, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2/2 }]}>{t("home.subtitle")}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace("/tutorial?next=tabs")}
              accessibilityLabel={t("settings.help")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <Ionicons name="help-circle-outline" size={20} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented (Overview | Exercise) */}
        <View style={styles.segmentOuter}>
          <TouchableOpacity style={[styles.segmentBtn, styles.segmentActive]}>
            <Ionicons name="home-outline" size={14} color="#FFF" />
            <Text style={[styles.segmentText, styles.segmentTextActive, { fontSize: scaled.base }]}>{t("home.overview")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentBtn}
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)/exercise")}
          >
            <Ionicons name="barbell-outline" size={14} />
            <Text style={[styles.segmentText, { fontSize: scaled.base }]}>{t("home.exercise")}</Text>
          </TouchableOpacity>
        </View>

        {/* FRA Matrix card */}
        <FRAMatrixCard
          inputs={{
            ...(typeof btrackScore === "number" && { btrackScore }),
            ...(typeof fesI === "number" && { fesI }),
          }}
          onBtrackUpdate={handleBtrackUpdate}
        />

        {/* Action Row 1 */}
        <View style={styles.rowTwo}>
          <PillButton icon="pulse-outline" label={t("home.balanceTest")} onPress={() => {router.replace("/(tabs)/balance-test")}} scaled={scaled} />
          <PillButton icon="clipboard-outline" label={t("home.questionnaire")} onPress={() => {router.push("/questionnaire")}} scaled={scaled} />
        </View>

        {/* Let's Chat */}
        <View style={styles.rowOne}>
          <PillButton
            icon="chatbubble-ellipses-outline"
            label={t("home.letsChat")}
            onPress={() => router.replace("/(tabs)/ai-chat")}
            full
            scaled={scaled}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PillButton({
  icon,
  label,
  onPress,
  full,
  scaled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  full?: boolean;
  scaled: ReturnType<typeof scaleFontSizes>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.pill, full && { flex: 1 }]}
    >
      <Ionicons name={icon} size={16} color="#5B4636" />
      <Text style={[styles.pillText, { fontSize: scaled.h1/2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const beige = "#F7EDE4";
const beigeDark = "#E6D4C6";
const warmRed = "#D84535";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  container: { paddingHorizontal: 16, gap: 14 },

  header: { paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#222" },
  subtitle: { marginTop: 3, marginBottom: 6, color: "#6B5E55" },

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
  segmentActive: { backgroundColor: warmRed },
  segmentText: { fontWeight: "700", color: "#7A6659" },
  segmentTextActive: { color: "#FFF" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardTitle: { fontWeight: "800", fontSize: 14, marginBottom: 8 },

  scoreCaption: {
    textAlign: "center",
    color: "#2E7D32",
    fontWeight: "700",
  },

  rowTwo: { flexDirection: "row", gap: 10 },
  rowOne: { flexDirection: "row" },

  pill: {
    flex: 1,
    backgroundColor: beigeDark,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  pillText: { fontWeight: "800", color: "#5B4636" },
});
