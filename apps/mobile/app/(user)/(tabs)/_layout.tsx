import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import UserTabIcon from "../../../src/components/UserTabIcon";
import { useAppSelector } from "../../../src/hooks/useRedux";

function FloatingCartBar() {
  const items = useAppSelector((state) => state.cart.items);
  const insets = useSafeAreaInsets();

  const visible = items.length > 0;
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  const fabScale = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Gear spins forever
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Scale FAB in/out
  useEffect(() => {
    fabScale.value = visible
      ? withSpring(1, { damping: 13, stiffness: 180 })
      : withSpring(0, { damping: 16, stiffness: 220 });
  }, [visible]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const gearStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const bottomOffset = insets.bottom + 100;

  return (
    <Animated.View
      style={[styles.fab, { bottom: bottomOffset }, fabStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable
        style={({ pressed }) => [styles.fabInner, pressed && styles.fabPressed]}
        onPress={() => router.push("/(user)/cart")}
      >
        {/* Layer 1: Spinning gear fills the entire FAB */}
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.gearLayer, gearStyle]}>
          <Ionicons name="settings" size={68} color="#0E9F6E" />
        </Animated.View>

        {/* Layer 2: White disc — always locked to center */}
        <View style={styles.centerOverlay}>
          <View style={styles.innerCircle} />
        </View>

        {/* Layer 3: Cart icon — always locked to center */}
        <View style={styles.centerOverlay}>
          <Ionicons name="cart" size={24} color="#0E9F6E" />
        </View>

        {/* Item count badge */}
        {totalCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {totalCount > 9 ? "9+" : totalCount}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 68,
    height: 68,
    zIndex: 100,
    shadowColor: "#0A7D55",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
  },
  fabInner: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: { opacity: 0.8 },
  gearLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Fills the FAB and centers children — reliable centering for any child
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#0E9F6E",
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#0E9F6E" },
});

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0E9F6E",
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
        <Tabs.Screen name="add-address" options={{ href: null, tabBarStyle: { display: "none" } }} />
        <Tabs.Screen name="verify-phone" options={{ href: null }} />
      </Tabs>
      <FloatingCartBar />
    </View>
  );
}

