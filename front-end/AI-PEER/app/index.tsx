// app/index.tsx
import { useState } from "react";
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
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
const onLogin = async () => {
  setErr(null);
  const p = normalizePhone(phone);
  if (p.length < 10) return setErr("Enter a valid phone number (10+ digits).");
  if (password.length < 6) return setErr("Password must be at least 6 characters.");

  try {
    setLoading(true);
    await api.sendCode(p, password, "login");
    router.push(`/verify?phone=${p}&mode=login`);
  } catch (e: any) {
    setErr(e.message || "Invalid phone or password");
  } finally {
    setLoading(false);
  }
};

const onCreate = async () => {
  setErr(null);
  const p = normalizePhone(phone);
  if (p.length < 10) return setErr("Enter a valid phone number (10+ digits).");
  if (password.length < 6) return setErr("Password must be at least 6 characters.");
  if (password !== confirmPassword.trim()) return setErr("Passwords do not match.");

  try {
    setLoading(true);
    await api.sendCode(p, password, "create");
    router.push(`/verify?phone=${p}&mode=create`);
  } catch (e: any) {
    setErr(e.message || "Failed to create account");
  } finally {
    setLoading(false);
  }
};

const switch_clearPages = async () => {
  setIsCreating(!isCreating);
  setShowPw(false);
  setPhone("");
  setPassword("");
  setConfirmPassword("");
  setErr(null);
}

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={s.wrap}>
        <Text style={s.brand}>AI PEER</Text>
        <Text style={s.subtitle}>{isCreating ? "Create an account" : "Sign in to continue"}</Text>

        {isCreating ? (
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
                placeholder="Create password"
                placeholderTextColor={colors.muted}
                style={[s.input, { flex: 1 }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.toggle}>
                <Text style={s.toggleText}>{showPw ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { marginTop: spacing(3) }]}>Confirm Password</Text>
            <View style={s.row}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPw}
                placeholder="Reenter password"
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

            <TouchableOpacity style={s.loginBtn} onPress={onCreate} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginTxt}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switch_clearPages()} style={s.switchWrap}>
              <Text style={s.switchText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
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

            <TouchableOpacity onPress={() => Alert.alert("Forgot Password", "That sucks... you got Alzheimer's or Dementia too or something? :(")}>
              <Text style={s.link}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.loginBtn} onPress={onLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginTxt}>Log In</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switch_clearPages()} style={s.switchWrap}>
              <Text style={s.switchText}>Don't have an account? Create an account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(6), backgroundColor: colors.background, justifyContent: "center" },
  brand: { fontSize: fontSizes.h1, fontWeight: "800", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: fontSizes.small, color: colors.text, textAlign: "center", marginTop: spacing(1), marginBottom: spacing(3) },

  form: { marginTop: spacing(6) },
  label: { fontSize: fontSizes.small, color: colors.text, marginBottom: spacing(1) },
  input: {
    borderWidth: 1, borderColor: colors.gray, borderRadius: radii.lg,
    paddingVertical: spacing(3), paddingHorizontal: spacing(3), fontSize: fontSizes.base, color: colors.text, backgroundColor: "#fff",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(0) },
  toggle: { marginLeft: spacing(1), paddingVertical: spacing(3), paddingHorizontal: spacing(3) },
  toggleText: { color: colors.primary, fontWeight: "600" },

  error: { color: "#b91c1c", marginTop: spacing(2) },

  loginBtn: { marginTop: spacing(8), backgroundColor: colors.primary, paddingVertical: spacing(3.5), borderRadius: radii.lg, alignItems: "center" },
  loginTxt: { color: "#fff", fontWeight: "700", fontSize: fontSizes.base },
  link: { color: colors.primary, textAlign: "center", marginTop: spacing(2.5), fontWeight: "600" },
  switchWrap: { marginTop: spacing(3), alignItems: "center" },
  switchText: { color: colors.primary, textAlign: "center", fontWeight: "700" },
});
