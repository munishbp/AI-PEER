// app/verify.tsx
import { useState, useEffect } from "react";
import { View, Text, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { signInWithCustomToken } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../src/firebaseClient";
import { api } from "../src/api";
import { colors, spacing, radii, fontSizes } from "../src/theme";

export default function Verify() {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone, mode } = useLocalSearchParams();
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
    if (code.length !== 6) return setErr(t("verify.enter6Digit"));
    setErr(null);

    try {
      setLoading(true);
      const res = await api.verify(phone as string, code);

      // Sign in with the custom token from the backend
      await signInWithCustomToken(auth, res.customToken);
      // Store refresh token for persistent login (30-day session)
      await AsyncStorage.setItem("refreshToken", res.refreshToken);
      console.log('[Auth] Refresh token stored after 2FA verification');

      // Navigate based on mode
      if (res.isNewUser || mode === 'create') {
        router.replace("/tutorial?next=welcome");
      } else {
        router.replace("/tutorial?next=tabs");
      }
    } catch (e: any) {
      setErr(e.message || t("verify.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    // Resend requires re-entering credentials, navigate back
    Alert.alert(
      t("verify.requestNewCodeTitle"),
      t("verify.requestNewCodeBody"),
      [
        { text: t("verify.goBack"), onPress: () => router.replace("/") },
        { text: t("verify.cancel"), style: "cancel" }
      ]
    );
  };

  const onBack = () => {
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={spacing(6)}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={s.wrap}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={s.backText}>{t("verify.back")}</Text>
            </TouchableOpacity>

            <Text style={s.brand}>AI PEER</Text>
            <Text style={s.subtitle}>{t("verify.subtitle")}</Text>

            <View style={s.form}>
                <Text style={s.label}>{t("verify.label")}</Text>
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
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyTxt}>{t("verify.verifyBtn")}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={onResend} disabled={cooldown > 0} style={s.resendWrap}>
                <Text style={[s.resendText, cooldown > 0 && { color: colors.muted }]}>
                  {cooldown > 0 ? t("verify.resendIn") + ` ${cooldown}s` : t("verify.resendCode")}
                </Text>
                </TouchableOpacity>
            </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(6), backgroundColor: colors.background, justifyContent: "center" },
  backBtn: { position: "absolute", top: spacing(16), left: spacing(6) },
  backText: { color: colors.primary, fontSize: fontSizes.base, fontWeight: "600" },
  brand: { fontSize: fontSizes.h1, fontWeight: "800", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: fontSizes.small, color: colors.text, textAlign: "center", marginTop: spacing(1), marginBottom: spacing(3) },

  form: { marginTop: spacing(6) },
  label: { fontSize: fontSizes.small, color: colors.text, marginBottom: spacing(1) },
  input: {
    borderWidth: 1, borderColor: colors.gray, borderRadius: radii.lg,
    paddingVertical: spacing(3), paddingHorizontal: spacing(3), fontSize: fontSizes.h1, color: colors.text, backgroundColor: "#fff",
    textAlign: "center", letterSpacing: spacing(1),
  },

  error: { color: "#b91c1c", marginTop: spacing(2), textAlign: "center" },

  verifyBtn: { marginTop: spacing(8), backgroundColor: colors.primary, paddingVertical: spacing(3.5), borderRadius: radii.lg, alignItems: "center" },
  verifyTxt: { color: "#fff", fontWeight: "700", fontSize: fontSizes.base },
  resendWrap: { marginTop: spacing(3), alignItems: "center" },
  resendText: { color: colors.primary, textAlign: "center", fontWeight: "600" },
});
