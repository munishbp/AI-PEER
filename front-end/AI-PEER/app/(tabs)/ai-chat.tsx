import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const beige = "#F7EDE4";
const beigeTile = "#F4E3D6";
const warmRed = "#D84535";

type ChatMessage = {
  id: string;
  from: "user" | "ai";
  text: string;
};

export default function AiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      from: "ai",
      text: "Hi, I’m AI-Peer. How can I help you with fall risk or daily activity today?",
    },
  ]);
  const [input, setInput] = useState("");  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      from: "user",
      text: trimmed,
    };

    // simple local “dummy AI” reply
    const aiMsg: ChatMessage = {
      id: String(Date.now() + 1),
      from: "ai",
      text:
        "Thanks for your message. In the real app, this is where the AI model would respond with guidance.",
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 3 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={warmRed} />
            <View>
              <Text style={styles.title}>AI PEER</Text>
              <Text style={styles.subtitle}>Ask about fall risk, activity, or tips</Text>
            </View>
          </View>
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
                  m.from === "user" ? styles.bubbleRowUser : styles.bubbleRowAi,
                ]}
              >
                {m.from === "ai" && (
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles-outline" size={16} color={warmRed} />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    m.from === "user" ? styles.bubbleUser : styles.bubbleAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      m.from === "user" && { color: "#FFFFFF" },
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>

                {m.from === "user" && (
                  <View style={styles.avatarUser}>
                    <Ionicons name="person-outline" size={16} color="#5B4636" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Input row */}
        <View style={styles.inputRow}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Type your question..."
              placeholderTextColor="#A58D7B"
              value={input}
              onChangeText={setInput}
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.85}
            style={styles.sendBtn}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: beige },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap:14
  },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, color: "#3F2F25" },
  subtitle: { marginTop: 3, marginBottom: 4, fontSize: 11, color: "#7A6659" },

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
    color: "#3F2F25",
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
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 7,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: "#E4D4C8",
  },
  input: {
    fontSize: 14,
    color: "#3F2F25",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: warmRed,
    alignItems: "center",
    justifyContent: "center",
  },
});
