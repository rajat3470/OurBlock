import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeliveryPartnerOrders } from "@hooks/useDeliveryPartnerOrders";
import { Order } from "@/types";
import { isPaymentOutstanding } from "@mohallamitr/shared";
import { colors } from "@/constants/theme";

function formatAddress(addr: any): string {
  if (!addr) return "No address";
  return [addr.street, addr.landmark, addr.city].filter(Boolean).join(", ");
}

function paymentBadge(order: Order) {
  if (order.paymentStatus === "completed") {
    return { label: "Paid", color: "#059669", bg: "#ECFDF5" };
  }
  if (order.paymentMethod === "cash" || order.paymentStatus === "cod") {
    return { label: "Collect cash", color: "#D97706", bg: "#FFFBEB" };
  }
  return { label: "Collect payment", color: "#0284C7", bg: "#F0F9FF" };
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready to deliver";
    case "outForDelivery":
      return "Out for delivery";
    default:
      return status;
  }
}

export default function DeliveryPartnerDashboard() {
  const insets = useSafeAreaInsets();
  const { orders, business, actionableCount, loading, error } =
    useDeliveryPartnerOrders();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.hero}>
        <Text style={styles.shopLabel}>Linked shop</Text>
        <Text style={styles.shopName} numberOfLines={1}>
          {business?.name || "Your shop"}
        </Text>
        {business?.address ? (
          <Text style={styles.shopAddress} numberOfLines={2}>
            {business.address}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>In queue</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{actionableCount}</Text>
            <Text style={styles.statLabel}>Ready now</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0891B2" size="large" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛵</Text>
              <Text style={styles.emptyTitle}>
                {error ? "Couldn’t load deliveries" : "No pending deliveries"}
              </Text>
              <Text style={styles.emptySub}>
                {error
                  ? error
                  : business?.name
                  ? `When ${business.name} assigns an order to you, it’ll show up here instantly.`
                  : "Orders assigned to you by the shop will show up here instantly."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pay = paymentBadge(item);
            const outstanding = isPaymentOutstanding(item.paymentStatus);
            const actionable =
              item.status === "ready" || item.status === "outForDelivery";
            return (
              <TouchableOpacity
                style={[styles.card, !actionable ? styles.cardMuted : null]}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(delivery-partner)/order-detail",
                    params: { id: item.id },
                  })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.badge, { backgroundColor: pay.bg }]}>
                    <Text style={[styles.badgeText, { color: pay.color }]}>{pay.label}</Text>
                  </View>
                </View>
                <Text style={styles.customer}>{(item as any).userName || "Customer"}</Text>
                <Text style={styles.address} numberOfLines={2}>
                  {formatAddress(item.deliveryAddress)}
                </Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.amount}>₹{Number(item.finalAmount).toFixed(0)}</Text>
                  <Text style={styles.status}>
                    {statusLabel(item.status)}
                    {outstanding && actionable ? " · collect on handoff" : ""}
                  </Text>
                </View>
                {!actionable ? (
                  <Text style={styles.waitHint}>Waiting for shop to mark Ready</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  shopLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  shopName: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
  },
  shopAddress: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  list: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardMuted: { opacity: 0.88 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  customer: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  address: { marginTop: 4, fontSize: 13, color: "#64748B", lineHeight: 18 },
  cardBottom: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: { fontSize: 18, fontWeight: "800", color: "#0E7490" },
  status: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  waitHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
