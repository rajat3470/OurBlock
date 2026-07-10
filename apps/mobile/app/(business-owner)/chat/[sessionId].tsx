import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { useAppSelector } from "@/hooks/useRedux";

export default function BusinessOwnerChatRoute() {
  const { sessionId, title } = useLocalSearchParams<{ sessionId: string; title?: string }>();
  const user = useAppSelector((state) => state.auth.user);

  if (!sessionId) return null;
  return <ChatScreen sessionId={sessionId} title={title || "Chat"} currentUserId={user?.id} />;
}
