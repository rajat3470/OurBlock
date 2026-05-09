import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";
import { colors } from "../../src/constants/theme";

export default function SuperAdminLayout() {
  return (
    <RoleGate allowedRole="superAdmin">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blue[500],
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
              <AppTabIcon emoji="📊" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="societies"
          options={{
            title: "Societies",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="🏘️" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="businesses"
          options={{
            title: "Businesses",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="🏪" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="👥" focused={focused} role="superAdmin" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon emoji="⚙️" focused={focused} role="superAdmin" />
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
