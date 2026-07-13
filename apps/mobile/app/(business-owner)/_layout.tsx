import { useEffect, useState } from "react";
import { Tabs, useSegments } from "expo-router";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import PendingOrderBanner from "../../src/components/PendingOrderBanner";
import { useAppSelector } from "../../src/hooks/useRedux";
import { OrderStatus } from "../../src/types";
import { isAcceptanceExpired } from "../../src/utils/orderAcceptance";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";
import { useBusinessOwnerRealtimeSync } from "../../src/hooks/useBusinessOwnerRealtimeSync";
import { useBusinessOwnerSuspension } from "../../src/hooks/useBusinessOwnerSuspension";

function AccountSuspendedOverlay({ secondsRemaining }: { secondsRemaining: number }) {
  return (
    <View style={overlayStyles.container}>
      <View style={overlayStyles.card}>
        <View style={overlayStyles.iconWrap}>
          <Ionicons name="ban-outline" size={48} color="#DC2626" />
        </View>
        <Text style={overlayStyles.title}>Account Blocked</Text>
        <Text style={overlayStyles.body}>
          Your account has been temporarily suspended because you rejected orders from
          the same user 5 times within 1 hour.
        </Text>
        <Text style={overlayStyles.contact}>
          Please contact the admin to unblock your account.
        </Text>
        <View style={overlayStyles.countdownWrap}>
          <ActivityIndicator size="small" color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={overlayStyles.countdownText}>
            Logging out in {secondsRemaining}s…
          </Text>
        </View>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  contact: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  countdownWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  countdownText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
});

export default function BusinessOwnerLayout() {
  useBusinessOwnerRealtimeSync();
  useOrderNotifications();
  const { isSuspended, secondsRemaining } = useBusinessOwnerSuspension();

  const segments = useSegments();
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const isOrdersScreen = segments.includes("orders");

  // Re-tick locally while any order is pending so the badge recomputes as each
  // 60s acceptance window lapses on the client clock.
  const hasPending = orders.some((o) => o.status === OrderStatus.PENDING);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [hasPending]);

  const activeOrderCount = orders.filter(
    (o) =>
      o.status !== OrderStatus.DELIVERED &&
      o.status !== OrderStatus.CANCELLED &&
      o.status !== OrderStatus.REJECTED &&
      !isAcceptanceExpired(o, now)
  ).length;

  return (
    <RoleGate allowedRole="businessOwner">
      <View style={{ flex: 1 }}>
        {isSuspended && <AccountSuspendedOverlay secondsRemaining={secondsRemaining} />}
        {!isOrdersScreen && <PendingOrderBanner />}
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#16A34A",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 0,
            height: 82,
            paddingBottom: 10,
            paddingTop: 10,
            marginHorizontal: 16,
            marginBottom: 28,
            borderRadius: 24,
            position: "absolute",
            shadowColor: "#1F2937",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 16,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="analytics-outline" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: "Products",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="cube-outline" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarBadge: activeOrderCount > 0 ? activeOrderCount : undefined,
            tabBarBadgeStyle: { backgroundColor: "#DC2626", fontSize: 10 },
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="receipt-outline" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="promotions"
          options={{
            title: "Promos",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="pricetag-outline" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="settings-outline" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="order-detail"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="delivery-partners"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
      </View>
    </RoleGate>
  );
}
