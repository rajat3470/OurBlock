import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import { useAppSelector } from "../../src/hooks/useRedux";
import { OrderStatus } from "../../src/types";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";

export default function BusinessOwnerLayout() {
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const activeOrderCount = orders.filter(
    (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
  ).length;

  useOrderNotifications();

  return (
    <RoleGate allowedRole="businessOwner">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#16A34A",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 0,
            height: 76,
            paddingBottom: 14,
            paddingTop: 8,
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
      </Tabs>
    </RoleGate>
  );
}
