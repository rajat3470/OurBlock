import { Tabs } from "expo-router";
import RoleGate from "../../src/components/RoleGate";
import AppTabIcon from "../../src/components/AppTabIcon";

export default function DeliveryPartnerLayout() {
  return (
    <RoleGate allowedRole="deliveryPartner">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0891B2",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 0,
            height: 82,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 12,
            shadowColor: "#0F172A",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
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
            title: "Deliveries",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="bicycle-outline" focused={focused} role="deliveryPartner" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <AppTabIcon iconName="person-outline" focused={focused} role="deliveryPartner" />
            ),
          }}
        />
        <Tabs.Screen
          name="order-detail"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </RoleGate>
  );
}
