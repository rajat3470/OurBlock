import { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { Tabs, router, useSegments } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import PendingOrderBanner from "../../src/components/PendingOrderBanner";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { logout } from "../../src/store/slices/authSlice";
import { clearBusinessOwnerState } from "../../src/store/slices/businessOwnerSlice";
import { clearUserAppState } from "../../src/store/slices/userAppSlice";
import { OrderStatus } from "../../src/types";
import { isAcceptanceExpired } from "../../src/utils/orderAcceptance";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";
import { apiClient } from "../../src/services/apiClient";
import { authStateService } from "../../src/services/authStateService";
import { OneSignalService } from "../../src/services/oneSignalService";
import { socketService } from "../../src/services/socketService";

export default function BusinessOwnerLayout() {
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const { loadOrders } = useBusinessOwner();
  const isSuspended = user?.status === "suspended";
  const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);

  // Hide banner on orders screen
  const isOrdersScreen = segments.includes("orders");

  useOrderNotifications();

  // Auto-rejection is a time-based, server-driven change with no realtime push,
  // and is only materialized when an order read applies lazy expiration. Poll
  // from the layout (any tab) while a pending order exists so the tab badge and
  // banner drop as soon as an order is auto-rejected, not just on the orders tab.
  const hasPending = orders.some((o) => o.status === OrderStatus.PENDING);
  useEffect(() => {
    if (!hasPending || isOrdersScreen) return;
    const timer = setInterval(() => {
      loadOrders({ silent: true }).catch(() => null);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasPending, isOrdersScreen, loadOrders]);

  // Re-tick locally while any order is pending so the badge recomputes as each
  // 60s window lapses — even if the backend write to `rejected` lags or hasn't
  // been deployed. Without this the count would only change on a data refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [hasPending]);

  // A pending order past its client-side deadline is effectively rejected, so
  // exclude it from the badge immediately (mirrors effectiveOrderStatus).
  const activeOrderCount = orders.filter(
    (o) =>
      o.status !== OrderStatus.DELIVERED &&
      o.status !== OrderStatus.CANCELLED &&
      o.status !== OrderStatus.REJECTED &&
      !isAcceptanceExpired(o, now)
  ).length;

  useEffect(() => {
    if (!isSuspended) {
      setLogoutCountdown(null);
      return;
    }
    setLogoutCountdown(10);
    const tick = setInterval(() => {
      setLogoutCountdown((c) => (c !== null && c > 1 ? c - 1 : 0));
    }, 1000);
    const timer = setTimeout(() => {
      clearInterval(tick);
      socketService.disconnect();
      OneSignalService.logout();
      dispatch(logout());
      dispatch(clearBusinessOwnerState());
      dispatch(clearUserAppState());
      apiClient.clearTokens().catch(() => null);
      authStateService.clearAuth().catch(() => null);
      setTimeout(() => router.replace("/(auth)/business-owner-login"), 50);
    }, 10_000);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [dispatch, isSuspended]);

  return (
    <RoleGate allowedRole="businessOwner">
      {isSuspended && (
        <>
          <Text style={styles.suspendedTitle}>Account Blocked</Text>
          <Text style={styles.suspendedBody}>
            Your account has been blocked due to excessive order rejections. You will be logged out in {logoutCountdown ?? 10}s.
          </Text>
        </>
      )}
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
      </Tabs>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  suspendedTitle: {
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  suspendedBody: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
});
