import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "../hooks/useRedux";
import { OrderStatus } from "../types";

interface PendingOrderBannerProps {
  visible?: boolean;
}

export default function PendingOrderBanner({ visible = true }: PendingOrderBannerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const orders = useAppSelector((state) => state.businessOwner.orders);
  const isLoading = useAppSelector((state) => state.businessOwner.isLoading);

  const pendingCount = orders.filter((o) => o.status === OrderStatus.PENDING).length;

  if (!visible || pendingCount === 0 || isLoading) return null;

  const handlePress = () => {
    router.push("/(business-owner)/orders");
  };

  return (
    <TouchableOpacity
      style={[styles.banner, { paddingTop: insets.top }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.bannerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>
            {pendingCount} New Order{pendingCount > 1 ? "s" : ""}
          </Text>
          <Text style={styles.bannerSubtitle}>
            Tap to view and accept
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#DC2626",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
  },
});
