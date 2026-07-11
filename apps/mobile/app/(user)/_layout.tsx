import { Stack } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";
import { useUserRealtimeSync } from "../../src/hooks/useUserRealtimeSync";

export default function UserLayout() {
  useOrderNotifications();
  useUserRealtimeSync();
  return (
    <RoleGate allowedRole="user">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="business" />
        <Stack.Screen name="product" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-detail" />
      </Stack>
    </RoleGate>
  );
}

