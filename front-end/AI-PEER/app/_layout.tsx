// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Landing (Login) */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Welcome - Accessibility Changes */}
      <Stack.Screen name="welcome" options={{ headerShown: false }} />

      {/* Verify - 2FA */}
      <Stack.Screen name="verify" options={{ headerShown: false }} />

      {/* Tabs group (Home/AI Chat/Activity/Contacts/Settings) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Questionnaire */}
      <Stack.Screen name="questionnaire" options={{ headerShown: false }} />

      {/* Optional routes from the Expo template */}
      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
    </Stack>
  );
}

