import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import { colors } from "../../src/constants/theme";

export default function UserLayout() {
  return (
    <RoleGate allowedRole="user">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.amber[600],
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
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="🏠" focused={focused} role="user" />
            ),
          }}
        />
        <Tabs.Screen
          name="businesses"
          options={{
            title: "Shops",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="🏪" focused={focused} role="user" />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="🛍️" focused={focused} role="user" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="👤" focused={focused} role="user" />
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
