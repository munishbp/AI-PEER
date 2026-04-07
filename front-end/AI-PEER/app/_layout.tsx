// app/_layout.tsx
import { Stack } from "expo-router";
import { LLMProvider } from "@/src/llm";
import {AuthProvider} from "@/src/auth"
import { PrefsProvider } from "../src/prefs-context";
import { VisionProvider } from "@/src/vision";
import * as Notifications from "expo-notifications";
import "../src/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <LLMProvider>
        <PrefsProvider>
          <VisionProvider>
            <Stack>
              {/* Landing (Login) */}
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />

              {/* Welcome - Accessibility Changes */}
              <Stack.Screen name="welcome" options={{ headerShown: false }} />

              {/* Verify - 2FA */}
              <Stack.Screen name="verify" options={{ headerShown: false }} />

              {/* Tutorial - post-2FA walkthrough */}
              <Stack.Screen name="tutorial" options={{ headerShown: false }} />

              {/* Tabs group (Home/AI Chat/Activity/Contacts/Settings) */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              {/* Questionnaire */}
              <Stack.Screen name="questionnaire" options={{ headerShown: false }} />

              {/* Chat History - accessible from AI Chat */}
              <Stack.Screen name="chat-history" options={{ headerShown: false }} />

              {/* Optional routes from the Expo template */}
              <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
              <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
            </Stack>
          </VisionProvider>
        </PrefsProvider>
      </LLMProvider>
    </AuthProvider>
  );
}

