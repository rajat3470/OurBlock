import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import UserTabIcon from "../../src/components/UserTabIcon";
import { useOrderNotifications } from "../../src/hooks/useOrderNotifications";

export default function UserLayout() {
  useOrderNotifications();
  return (
    <RoleGate allowedRole="user">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#DC2626",
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
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <UserTabIcon iconName="home-outline" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="businesses"
          options={{
            title: "Shops",
            tabBarIcon: ({ focused }) => (
              <UserTabIcon iconName="storefront-outline" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ focused }) => (
              <UserTabIcon iconName="receipt-outline" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <UserTabIcon iconName="person-outline" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen name="addresses" options={{ href: null }} />
        <Tabs.Screen name="add-address" options={{ href: null }} />
        <Tabs.Screen name="verify-phone" options={{ href: null }} />
        <Tabs.Screen name="product" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
      </Tabs>
    </RoleGate>
  );
}
