import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChat } from "@/hooks/useChat";
import ScreenHeader from "@/components/ScreenHeader";

interface ChatScreenProps {
  sessionId: string;
  title?: string;
  currentUserId?: string;
}

function formatTime(value: any) {
  if (!value) return "";
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function ChatScreen({ sessionId, title = "Chat", currentUserId }: ChatScreenProps) {
  const { messages, loading, sending, error, sendMessage } = useChat(sessionId);
  const [text, setText] = React.useState("");
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage(trimmed);
    listRef.current?.scrollToEnd({ animated: true });
  }, [text, sendMessage]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isMe = currentUserId ? item.senderId === currentUserId : true;
      return (
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text style={[styles.bubbleText, isMe ? styles.textRight : styles.textLeft]}>
            {item.content}
          </Text>
          <Text style={[styles.time, isMe ? styles.timeRight : styles.timeLeft]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      );
    },
    [currentUserId]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item: any) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            style={styles.input}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 24 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#6366f1",
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  textLeft: { color: "#1f2937" },
  textRight: { color: "#fff" },
  time: { fontSize: 11, marginTop: 4 },
  timeLeft: { color: "#9ca3af", textAlign: "left" },
  timeRight: { color: "#e0e7ff", textAlign: "right" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#6366f1",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#fff", fontWeight: "600" },
  errorBanner: {
    backgroundColor: "#fee2e2",
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: { color: "#b91c1c", fontSize: 13 },
});
