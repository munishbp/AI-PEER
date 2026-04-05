/**
 * chat-history.tsx - Conversation History Page
 *
 * Shows list of past AI conversations with:
 * - Preview of each conversation (first user message)
 * - Timestamp (relative, like "2 hours ago")
 * - Tap to continue that conversation
 * - Swipe or button to delete
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { usePrefs } from "../src/prefs-context";
import { useLLM } from "@/src/llm";
import { Conversation } from "@/src/llm/types";

// Same color scheme as other pages
const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";
const darkText = "#3F2F25";
const subtleText = "#7A6659";

export default function ChatHistoryScreen() {
  const router = useRouter();
  const {
    conversations,
    currentConversationId,
    select,
    startNew,
    remove,
    getPreview,
  } = useLLM();

  const { scaled, colors } = usePrefs();
  const { t } = useTranslation();

  // Handle selecting a conversation
  function handleSelect(id: string) {
    select(id);
    router.back(); // Go back to chat screen
  }

  // Handle creating new conversation
  function handleNewConversation() {
    startNew();
    router.back();
  }

  // Handle delete with confirmation
  function handleDelete(id: string) {
    Alert.alert(
      t("chat-history.deleteConversationTitle"),
      t("chat-history.deleteConversationBody"),
      [
        { text: t("chat-history.cancel"), style: "cancel" },
        {
          text: t("chat-history.delete"),
          style: "destructive",
          onPress: () => remove(id),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={darkText} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: scaled.h3 }]}>{t("chat-history.title")}</Text>
          <Text style={[styles.subtitle, { fontSize: scaled.small }]}>
            {t("chat-history.conversation", { count: conversations.length })}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleNewConversation}
          style={styles.newButton}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {conversations.map((convo) => (
          <ConversationCard
            key={convo.id}
            conversation={convo}
            isActive={convo.id === currentConversationId}
            preview={getPreview(convo)}
            onSelect={() => handleSelect(convo.id)}
            onDelete={() => handleDelete(convo.id)}
          />
        ))}
        {/* Isn't necessary; LLMContext.tsx makes sure there's always >0 */}
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={subtleText} />
            <Text style={[styles.emptyText, { fontSize: scaled.base }]}>{t("chat-history.noConversations")}</Text>
            <TouchableOpacity
              onPress={handleNewConversation}
              style={styles.emptyButton}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>{t("chat-history.startConversation")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * ConversationCard - Individual conversation item
 *
 * I extracted this as a separate component because:
 * 1. It keeps the main component cleaner
 * 2. React can optimize re-renders better with smaller components
 * 3. It's reusable if we need it elsewhere
 */
function ConversationCard({
  conversation,
  isActive,
  preview,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  preview: string;
  onSelect: () => void;
  onDelete: () => void;
}) {
  // Format timestamp as relative time ("2 hours ago", "Yesterday", etc.)
  const { t } = useTranslation();
  const timeAgo = formatTimeAgo(conversation.lastMessageAt, t);
  const { scaled } = usePrefs();


  // Count messages (excluding system messages)
  const messageCount = conversation.messages.filter(
    (m) => m.role !== "system"
  ).length;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[styles.card, isActive && styles.cardActive]}
    >
      {/* Left side: Icon */}
      <View style={[styles.cardIcon, isActive && styles.cardIconActive]}>
        <Ionicons
          name={isActive ? "chatbubble" : "chatbubble-outline"}
          size={20}
          color={isActive ? "#FFFFFF" : warmRed}
        />
      </View>

      {/* Middle: Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardPreview, { fontSize: scaled.h1/2 }]} numberOfLines={2}>
          {preview}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardTime, { fontSize: scaled.base*0.75 }]}>{timeAgo}</Text>
          <Text style={[styles.cardDot, { fontSize: scaled.base*0.75 }]}>•</Text>
          <Text style={[styles.cardCount, { fontSize: scaled.base*0.75 }]}>
            {t("chat-history.message", { count: messageCount })}
          </Text>
        </View>
      </View>

      {/* Right side: Delete button */}
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={subtleText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/**
 * Format a timestamp as relative time
 *
 * This function takes a timestamp (milliseconds since 1970) and returns
 * a human-readable string like "Just now", "5 minutes ago", "2 hours ago"
 */
function formatTimeAgo(timestamp: number, t: (key: string, options?: any) => string): string {
  const now = Date.now();
  const diffMs = now - timestamp;

  // Convert to seconds, minutes, hours, days
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return t("chat-history.justNow");
  } else if (diffMinutes < 60) {
    return t("chat-history.minutesAgo", { count: diffMinutes });
  } else if (diffHours < 24) {
    return t("chat-history.hoursAgo", { count: diffHours });
  } else if (diffDays === 1) {
    return t("chat-history.yesterday");
  } else {
    return t("chat-history.daysAgo", { count: diffDays });
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: beige,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: darkText,
  },
  subtitle: {
    fontSize: 12,
    color: subtleText,
    marginTop: 2,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: warmRed,
    alignItems: "center",
    justifyContent: "center",
  },

  listContainer: {
    padding: 16,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  cardActive: {
    borderWidth: 2,
    borderColor: warmRed,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconActive: {
    backgroundColor: warmRed,
  },
  cardContent: {
    flex: 1,
  },
  cardPreview: {
    fontSize: 14,
    fontWeight: "600",
    color: darkText,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  cardTime: {
    fontSize: 12,
    color: subtleText,
  },
  cardDot: {
    fontSize: 12,
    color: subtleText,
  },
  cardCount: {
    fontSize: 12,
    color: subtleText,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: subtleText,
    fontWeight: "600",
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: warmRed,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
