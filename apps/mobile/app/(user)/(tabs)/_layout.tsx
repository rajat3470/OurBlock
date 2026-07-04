import { View, Text, StyleSheet, Pressable } from "react-native";
import { Tabs, router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector } from "../../../src/hooks/useRedux";

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  home: { label: "Home", icon: "home-outline", iconActive: "home" },
  businesses: { label: "Stores", icon: "storefront-outline", iconActive: "storefront" },
  orders: { label: "Orders", icon: "receipt-outline", iconActive: "receipt" },
  profile: { label: "Profile", icon: "person-outline", iconActive: "person" },
};

const ACTIVE = "#0E9F6E";
const INACTIVE = "#94A3B8";

function UserTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const cartItems = useAppSelector((s) => s.cart.items);
  const totalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const renderTab = (routeKey: string, routeName: string, index: number) => {
    const meta = TAB_META[routeName];
    if (!meta) return null;
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    };

    return (
      <Pressable key={routeKey} style={styles.tabItem} onPress={onPress} hitSlop={8}>
        <View style={styles.indicatorSlot}>
          {isFocused ? <View style={styles.activeIndicator} /> : null}
        </View>
        <Ionicons
          name={isFocused ? meta.iconActive : meta.icon}
          size={23}
          color={isFocused ? ACTIVE : INACTIVE}
        />
        <Text style={[styles.tabLabel, { color: isFocused ? ACTIVE : INACTIVE }]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  const tabs = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => TAB_META[route.name]);

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  return (
    <View style={[styles.bar, { height: 64 + insets.bottom, paddingBottom: insets.bottom }]}>
      <View style={styles.side}>
        {left.map(({ route, index }) => renderTab(route.key, route.name, index))}
      </View>

      <View style={styles.centerSlot}>
        <Pressable
          style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}
          onPress={() => router.push("/(user)/cart")}
          hitSlop={8}
        >
          <LinearGradient
            colors={["#F59E0B", "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cartCircle}
          >
            <Ionicons name="cart" size={26} color="#FFFFFF" />
          </LinearGradient>
          {totalCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalCount > 9 ? "9+" : totalCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Text style={styles.cartLabel}>Cart</Text>
      </View>

      <View style={styles.side}>
        {right.map(({ route, index }) => renderTab(route.key, route.name, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
    paddingTop: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  side: {
    flex: 1,
    flexDirection: "row",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
  },
  indicatorSlot: {
    height: 5,
    justifyContent: "center",
    marginBottom: 2,
  },
  activeIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACTIVE,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  centerSlot: {
    width: 74,
    alignItems: "center",
  },
  cartBtn: {
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    padding: 4,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  cartBtnPressed: { opacity: 0.85 },
  cartCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cartLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    marginTop: 3,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0E9F6E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <UserTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="businesses" options={{ title: "Shops" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="add-address" options={{ href: null }} />
      <Tabs.Screen name="verify-phone" options={{ href: null }} />
    </Tabs>
  );
}
