// app/verify.tsx
import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { signInWithCustomToken } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../src/firebaseClient";
import { api } from "../src/api";
import { usePrefs } from "../src/prefs-context";
import { type ContrastPalette, scaleFontSizes, spacing, radii } from "../src/theme";
import { useI18n } from "../src/i18n";

export default function Verify() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams();
  const { colors, scaled } = usePrefs();
  const { t } = useI18n();
  const s = useMemo(() => createStyles(colors, scaled), [colors, scaled]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const onVerify = async () => {
    if (code.length !== 6) return setErr(t("verify.invalid_code_length"));
    setErr(null);

    try {
      setLoading(true);
      const res = await api.verify(phone as string, code);

      await signInWithCustomToken(auth, res.customToken);
      await AsyncStorage.setItem("refreshToken", res.refreshToken);
      console.log("[Auth] Refresh token stored after 2FA verification");

      if (res.isNewUser || mode === "create") {
        router.replace("/tutorial?next=welcome");
      } else {
        router.replace("/tutorial?next=tabs");
      }
    } catch (e: any) {
      setErr(e.message || t("verify.invalid_code"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    Alert.alert(
      t("verify.request_new_code_title"),
      t("verify.request_new_code_body"),
      [
        { text: t("verify.go_back"), onPress: () => router.replace("/") },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const onBack = () => {
    router.replace("/");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={s.wrap}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>{t("common.back")}</Text>
        </TouchableOpacity>

        <Text style={s.brand}>{t("common.app_name")}</Text>
        <Text style={s.subtitle}>{t("verify.subtitle")}</Text>

        <View style={s.form}>
          <Text style={s.label}>{t("verify.code_label")}</Text>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
            keyboardType="numeric"
            placeholder="123456"
            placeholderTextColor={colors.muted}
            style={s.input}
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {err ? <Text style={s.error}>{err}</Text> : null}

          <TouchableOpacity style={s.verifyBtn} onPress={onVerify} disabled={loading || code.length !== 6}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyTxt}>{t("verify.verify")}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onResend} disabled={cooldown > 0} style={s.resendWrap}>
            <Text style={[s.resendText, cooldown > 0 && { color: colors.muted }]}> 
              {cooldown > 0 ? t("verify.resend_in", { count: cooldown }) : t("verify.resend_code")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = (
  colors: ContrastPalette,
  scaled: ReturnType<typeof scaleFontSizes>
) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: spacing(6), backgroundColor: colors.background, justifyContent: "center" },
    backBtn: { position: "absolute", top: spacing(16), left: spacing(6) },
    backText: { color: colors.accent, fontSize: scaled.base, fontWeight: "600" },
    brand: { fontSize: scaled.h1, fontWeight: "800", color: colors.accent, textAlign: "center" },
    subtitle: { fontSize: scaled.small, color: colors.text, textAlign: "center", marginTop: spacing(1), marginBottom: spacing(3) },

    form: { marginTop: spacing(6) },
    label: { fontSize: scaled.small, color: colors.text, marginBottom: spacing(1) },
    input: {
      borderWidth: 1,
      borderColor: colors.muted,
      borderRadius: radii.lg,
      paddingVertical: spacing(3),
      paddingHorizontal: spacing(3),
      fontSize: scaled.h1,
      color: colors.text,
      backgroundColor: colors.bgTile,
      textAlign: "center",
      letterSpacing: spacing(1),
    },

    error: { color: "#b91c1c", marginTop: spacing(2), textAlign: "center" },

    verifyBtn: { marginTop: spacing(8), backgroundColor: colors.accent, paddingVertical: spacing(3.5), borderRadius: radii.lg, alignItems: "center" },
    verifyTxt: { color: "#fff", fontWeight: "700", fontSize: scaled.base },
    resendWrap: { marginTop: spacing(3), alignItems: "center" },
    resendText: { color: colors.accent, textAlign: "center", fontWeight: "600" },
  });
