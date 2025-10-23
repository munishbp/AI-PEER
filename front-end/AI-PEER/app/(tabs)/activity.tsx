// app/(tabs)/activity.tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../src/theme";

export default function Activity() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Activity</Text>
      <Text style={s.text}>Weekly activity data and progress will appear here.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  text: { fontSize: 16, color: colors.muted },
});
