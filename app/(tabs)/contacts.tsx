// app/(tabs)/contacts.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../src/theme";

export default function Contacts() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Contacts</Text>
      <Text style={s.text}>Your saved emergency and support contacts will appear here.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  text: { fontSize: 16, color: colors.muted },
});
