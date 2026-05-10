import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import { colors } from "../../src/constants/theme";
import { useAppSelector } from "../../src/hooks/useRedux";
import { OrderStatus } from "../../src/types";

export default function BusinessOwnerLayout() {
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const activeOrderCount = orders.filter(
    (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
  ).length;
  return (
    <RoleGate allowedRole="businessOwner">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green[500],
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 82,
            paddingBottom: 18,
            paddingTop: 8,
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
              <AppTabIcon emoji="📈" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: "Products",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="📦" focused={focused} role="businessOwner" />
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
              <AppTabIcon emoji="🧾" focused={focused} role="businessOwner" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="⚙️" focused={focused} role="businessOwner" />
            ),
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
