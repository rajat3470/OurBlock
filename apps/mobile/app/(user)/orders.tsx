import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useUserApp } from "../../src/hooks/useUserApp";
import { Order, OrderStatus } from "../../src/types";

type FilterKey = "all" | "active" | "completed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const ACTIVE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  pending:         { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
  confirmed:       { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  preparing:       { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  ready:           { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
  outForDelivery:  { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8" },
  delivered:       { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" },
  cancelled:       { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  rejected:        { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
};

const STATUS_LABEL: Record<string, string> = {
  pending:        "Waiting for Acceptance",
  confirmed:      "Accepted",
  preparing:      "Processing",
  ready:          "Ready to Collect",
  outForDelivery: "On the Way",
  delivered:      "Completed",
  cancelled:      "Cancelled",
  rejected:       "Rejected",
};

function getStatusStyle(status: string) {
  return STATUS_COLOR[status] ?? STATUS_COLOR.pending;
}

export default function UserOrders() {
  const { orders, isLoading, loadMyOrders, cancelOrder } = useUserApp();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    loadMyOrders().catch(() => null);
  }, [loadMyOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "active") {
      return orders.filter((item) => ACTIVE_STATUSES.includes(item.status));
    }
    if (activeFilter === "completed") {
      return orders.filter(
        (item) =>
          item.status === OrderStatus.DELIVERED ||
          item.status === OrderStatus.CANCELLED ||
          item.status === OrderStatus.REJECTED
      );
    }
    return orders;
  }, [activeFilter, orders]);

  function handleCancel(orderId: string) {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => cancelOrder(orderId).catch(() => null),
      },
    ]);
  }

  const renderItem = ({ item }: { item: Order }) => {
    const statusStyle = getStatusStyle(item.status);
    const canCancel =
      item.status === OrderStatus.PENDING || item.status === OrderStatus.CONFIRMED;

    return (
      <View style={styles.card}>
        {/* Top row */}
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.businessName}>{(item as any).businessName ?? "Shop"}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.amount}>Rs {item.finalAmount}</Text>
            <Text style={styles.orderMeta}>{item.items.length} item{item.items.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        {/* Items list */}
        {item.items.slice(0, 3).map((orderItem: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemQty}>{orderItem.quantity}×</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {orderItem.productName ?? `Item ${idx + 1}`}
            </Text>
            <Text style={styles.itemPrice}>Rs {orderItem.lineTotal ?? orderItem.price * orderItem.quantity}</Text>
          </View>
        ))}
        {item.items.length > 3 ? (
          <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
        ) : null}

        {/* Price breakdown */}
        <View style={styles.priceBreakdown}>
          <Text style={styles.priceBreakdownText}>
            Subtotal: Rs {(item as any).subTotal ?? item.totalAmount} · Platform fee: Rs {(item as any).platformFee ?? 2}
          </Text>
        </View>

        {/* Bottom row */}
        <View style={styles.rowBottom}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>
          <View style={styles.rowBottomRight}>
            <Text style={styles.paymentText}>{item.paymentStatus}</Text>
            {canCancel ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item.id)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {/* Show rejection reason if order was rejected */}
        {item.status === OrderStatus.REJECTED && (item as any).rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionLabel}>Rejection reason:</Text>
            <Text style={styles.rejectionText}>{(item as any).rejectionReason}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader title="My Orders" subtitle="Track your purchases" />

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              activeFilter === filter.key ? styles.filterBtnActive : null,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter.key ? styles.filterLabelActive : null,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#D97706" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={() => loadMyOrders().catch(() => null)}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                Your placed orders will appear here.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push("/(user)/home")}
              >
                <Text style={styles.browseBtnText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  filterBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBtnActive: { backgroundColor: "#D97706" },
  filterLabel: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  filterLabelActive: { color: "#FFFFFF" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  orderId: { fontSize: 14, fontWeight: "800", color: "#111827" },
  businessName: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  rightCol: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "800", color: "#D97706" },
  orderMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 6,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 28,
    textAlign: "center",
  },
  itemName: { flex: 1, fontSize: 13, color: "#374151" },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#111827" },
  moreItems: { fontSize: 11, color: "#9CA3AF", marginTop: 4, marginLeft: 34 },
  priceBreakdown: {
    marginTop: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceBreakdownText: { fontSize: 11, color: "#9CA3AF" },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowBottomRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  paymentText: { color: "#64748B", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cancelBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: { fontSize: 11, fontWeight: "700", color: "#991B1B" },
  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  browseBtn: {
    marginTop: 8,
    backgroundColor: "#D97706",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  browseBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  rejectionBanner: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionLabel: { fontSize: 11, fontWeight: "700", color: "#991B1B", marginBottom: 2 },
  rejectionText: { fontSize: 12, color: "#7F1D1D", lineHeight: 17 },
});
