import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePrefs } from "../../src/prefs-context";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: colors.tabs,
          borderTopColor: colors.accent, //"#E4D4C8",
          height: 63,
          paddingHorizontal: 10,
          paddingBottom: 24,
          paddingTop: 3,
        },
        tabBarActiveTintColor: colors.tabColor,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: scaled.h2/2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs_layout.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: t("tabs_layout.ai-chat"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t("tabs_layout.activity"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t("tabs_layout.contacts"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs_layout.settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden routes that still keep the tab bar visible */}
      <Tabs.Screen name="exercise" options={{ href: null }} />
      <Tabs.Screen name="exercise-session" options={{ href: null }} />
      <Tabs.Screen name="video-confirm" options={{ href: null }} />
    </Tabs>
  );
}
