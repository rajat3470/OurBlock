import { useCallback, useEffect, useState } from "react";
import { Message } from "@/types";
import { chatService } from "@/services/chatService";

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await chatService.getMessages(sessionId);
      setMessages(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return false;
      setSending(true);
      setError(null);
      try {
        const message = await chatService.sendMessage(sessionId, content.trim());
        setMessages((prev) => [...prev, message]);
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to send message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [sessionId]
  );

  return {
    messages,
    loading,
    sending,
    error,
    loadMessages,
    sendMessage,
  };
}
