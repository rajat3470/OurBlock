import { apiClient } from "@/services/apiClient";
import { ChatSession, Message } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const chatService = {
  async getSessions(): Promise<ChatSession[]> {
    const res = await apiClient.get<ApiResponse<ChatSession[]>>("/chat/sessions");
    if (!res.success || !res.data) throw new Error(res.error || "Failed to load sessions");
    return res.data;
  },

  async createSession(businessId: string): Promise<ChatSession> {
    const res = await apiClient.post<ApiResponse<ChatSession>>("/chat/sessions", { businessId });
    if (!res.success || !res.data) throw new Error(res.error || "Failed to create session");
    return res.data;
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await apiClient.get<ApiResponse<Message[]>>(`/chat/sessions/${sessionId}/messages`);
    if (!res.success || !res.data) throw new Error(res.error || "Failed to load messages");
    return res.data;
  },

  async sendMessage(sessionId: string, content: string, type = "text"): Promise<Message> {
    const res = await apiClient.post<ApiResponse<Message>>(`/chat/sessions/${sessionId}/messages`, {
      content,
      type,
    });
    if (!res.success || !res.data) throw new Error(res.error || "Failed to send message");
    return res.data;
  },
};
