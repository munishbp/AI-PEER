/**
 * ai-chat.tsx - AI Chat screen with on-device LLM
 *
 * This screen provides a chat interface powered by Qwen3-0.6B running locally.
 * All processing happens on-device - no patient data leaves the phone.
 *
 * Features:
 * - Model download prompt for first-time users
 * - Real-time chat with typing indicators
 * - Conversation persistence (24-hour TTL)
 * - Clear conversation option
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLLM } from "@/src/llm";
import ModelDownloadModal from "@/components/ModelDownloadModal";
import { usePrefs } from "../../src/prefs-context";

// App color scheme
const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";
const darkText = "#3F2F25";
const subtleText = "#7A6659";

export default function AiChatScreen() {
  const router = useRouter();
  const {
    needsDownload,
    needsInit,
    isReady,
    isGenerating,
    downloadProgress,
    error,
    messages,
    send,
    downloadAndInit,
    startDownload,
    initializeModel,
    clear,
  } = useLLM();

  const [input, setInput] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { scaled, colors } = usePrefs();

  // Show download modal if model not downloaded
  useEffect(() => {
    if (needsDownload) {
      setShowDownloadModal(true);
    }
  }, [needsDownload]);

  // Auto-initialize model after download
  useEffect(() => {
    if (needsInit && !isDownloading) {
      initializeModel().catch(console.error);
    }
  }, [needsInit, isDownloading, initializeModel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Handle download start
  async function handleStartDownload() {
    setIsDownloading(true);
    try {
      await downloadAndInit();
      setShowDownloadModal(false);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  }

  // Handle send message
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || !isReady || isGenerating) return;

    setInput("");
    try {
      await send(trimmed);
    } catch (err) {
      console.error("Send failed:", err);
    }
  }

  // Handle clear conversation
  function handleClear() {
    clear();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Download Modal */}
      <ModelDownloadModal
        visible={showDownloadModal}
        downloadProgress={downloadProgress}
        isDownloading={isDownloading}
        error={error}
        onStartDownload={handleStartDownload}
        onCancel={() => setShowDownloadModal(false)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 3 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={warmRed} />
            <View>
              <Text style={[styles.title, { fontSize: scaled.h3 }]}>AI PEER</Text>
              <Text style={[styles.subtitle, { fontSize: scaled.h2/2 }]}> 
                {!isReady
                  ? needsDownload
                    ? "Download required"
                    : "Loading model..."
                  : "Ask AI Chat about fall risk, activity, or tips"}
              </Text>
            </View>
          </View>

          {/* History button - navigate to conversation list */}
          <TouchableOpacity
            onPress={() => router.push("/chat-history" as any)}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={subtleText} />
          </TouchableOpacity>

          {/* Clear button */}
          {messages.length > 1 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={subtleText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chat area */}
        <View style={styles.chatCard}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.chatScroll}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubbleRow,
                  m.role === "user" ? styles.bubbleRowUser : styles.bubbleRowAi,
                ]}
              >
                {m.role === "assistant" && (
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles-outline" size={16} color={warmRed} />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    m.role === "user" ? styles.bubbleUser : styles.bubbleAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === "user" && { color: "#FFFFFF" },
                      { fontSize: scaled.h1/2 },
                    ]}
                  >
                    {m.content}
                  </Text>
                </View>

                {m.role === "user" && (
                  <View style={styles.avatarUser}>
                    <Ionicons name="person-outline" size={16} color="#5B4636" />
                  </View>
                )}
              </View>
            ))}

            {/* Typing indicator */}
            {isGenerating && (
              <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
                <View style={styles.avatar}>
                  <Ionicons name="sparkles-outline" size={16} color={warmRed} />
                </View>
                <View style={[styles.bubble, styles.bubbleAi]}>
                  <ActivityIndicator size="small" color={warmRed} />
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Input row */}
        <View style={styles.inputRow}>
          <View style={styles.inputBox}>
            <TextInput
              style={[styles.input, { fontSize: scaled.h1/2 }]}
              placeholder={
                !isReady
                  ? "Model loading..."
                  : "Type your question..."
              }
              placeholderTextColor="#A58D7B"
              value={input}
              onChangeText={setInput}
              multiline
              editable={isReady && !isGenerating}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.85}
            style={[
              styles.sendBtn,
              (!isReady || isGenerating || !input.trim()) && styles.sendBtnDisabled,
            ]}
            disabled={!isReady || isGenerating || !input.trim()}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap:14,
  },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: darkText },
  subtitle: { marginTop: 3, marginBottom: 4, fontSize: 11, color: subtleText },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: beigeTile,
  },

  chatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1.5 },
    }),
  },
  chatScroll: {
    paddingBottom: 10,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bubbleRowAi: {
    justifyContent: "flex-start",
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  avatarUser: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: beigeTile,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  bubble: {
    maxWidth: "75%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  bubbleAi: {
    backgroundColor: beigeTile,
    borderBottomLeftRadius: 2,
  },
  bubbleUser: {
    backgroundColor: warmRed,
    borderBottomRightRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    color: darkText,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 8,
  },
  inputBox: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 5,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: "#E4D4C8",
  },
  input: {
    fontSize: 14,
    color: darkText,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: warmRed,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
