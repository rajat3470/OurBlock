import { useEffect } from "react";
import { Tabs, useSegments } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import PendingOrderBanner from "../../src/components/PendingOrderBanner";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { OrderStatus } from "../../src/types";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";

export default function BusinessOwnerLayout() {
  const segments = useSegments();
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const { loadOrders } = useBusinessOwner();
  const activeOrderCount = orders.filter(
    (o) =>
      o.status !== OrderStatus.DELIVERED &&
      o.status !== OrderStatus.CANCELLED &&
      o.status !== OrderStatus.REJECTED
  ).length;

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

  return (
    <RoleGate allowedRole="businessOwner">
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
