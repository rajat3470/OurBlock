import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";

export default function SuperAdminLayout() {
  return (
    <RoleGate allowedRole="superAdmin">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
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
              <AppTabIcon iconName="grid-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="societies"
          options={{
            title: "Societies",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="business-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="businesses"
          options={{
            title: "Businesses",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="storefront-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="people-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="banners"
          options={{
            title: "Banners",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="image-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="settings-outline" focused={focused} role="superAdmin" />
            ),
          }}
        />
        {/* Hidden screens — not shown in tab bar */}
        <Tabs.Screen name="create-society" options={{ href: null }} />
        <Tabs.Screen name="create-business-owner" options={{ href: null }} />
      </Tabs>
    </RoleGate>
  );
}
