// app/index.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/api";
import { colors, spacing, radii, fontSizes } from "../src/theme";

function normalizePhone(input: string) {
  // keep digits only; backend can decide final validation
  return (input || "").replace(/\D/g, "");
}

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

 /* const onSubmit = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (p.length < 10) return setErr("Enter a valid phone number (10+ digits).");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    
   
    try {
      setLoading(true);
      const res = await api.login(p, password);
      // store token for later requests
      try { await AsyncStorage.setItem("token", res.token); } catch {}
      router.replace("/(tabs)"); // go to the app after login
    } catch (e: any) {
      setErr("Invalid phone or password");
    } finally {
      setLoading(false);
    }
  };
*/
 const onSubmit = async () => {
  // TEMP DEV BYPASS: if both fields have something, go in
  if (phone.trim() && password.trim()) {
    return router.replace("/(tabs)");
  }
  setErr("Enter phone and password.");
};

  return (
    <View style={s.wrap}>
      <Text style={s.brand}>AI PEER</Text>
      <Text style={s.subtitle}>Sign in to continue</Text>

      <View style={s.form}>
        <Text style={s.label}>Phone number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
          placeholderTextColor={colors.muted}
          style={s.input}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[s.label, { marginTop: spacing(3) }]}>Password</Text>
        <View style={s.row}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            placeholder="Enter password"
            placeholderTextColor={colors.muted}
            style={[s.input, { flex: 1 }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.toggle}>
            <Text style={s.toggleText}>{showPw ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        {err ? <Text style={s.error}>{err}</Text> : null}

        <TouchableOpacity style={s.loginBtn} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginTxt}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Alert.alert("Forgot Password", "Flow not implemented yet.")}>
          <Text style={s.link}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(6), backgroundColor: colors.background, justifyContent: "center" },
  brand: { fontSize: fontSizes.h1, fontWeight: "800", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: fontSizes.small, color: colors.text, textAlign: "center", marginTop: spacing(1) },

  form: { marginTop: spacing(6) },
  label: { fontSize: fontSizes.small, color: colors.text, marginBottom: spacing(1) },
  input: {
    borderWidth: 1, borderColor: colors.gray, borderRadius: radii.lg,
    paddingVertical: spacing(3), paddingHorizontal: spacing(3), fontSize: fontSizes.base, color: colors.text, backgroundColor: "#fff",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  toggle: { marginLeft: spacing(2), paddingVertical: spacing(3), paddingHorizontal: spacing(3) },
  toggleText: { color: colors.primary, fontWeight: "600" },

  error: { color: "#b91c1c", marginTop: spacing(2) },

  loginBtn: { marginTop: spacing(4), backgroundColor: colors.primary, paddingVertical: spacing(3.5), borderRadius: radii.lg, alignItems: "center" },
  loginTxt: { color: "#fff", fontWeight: "700", fontSize: fontSizes.base },
  link: { color: colors.primary, textAlign: "center", marginTop: spacing(3), fontWeight: "600" },
});
