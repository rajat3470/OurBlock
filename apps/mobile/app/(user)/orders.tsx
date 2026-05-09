import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
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

export default function UserOrders() {
  const { orders, isLoading, loadMyOrders } = useUserApp();
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
          item.status === OrderStatus.CANCELLED
      );
    }

    return orders;
  }, [activeFilter, orders]);

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View>
          <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderMeta}>{item.items.length} items</Text>
        </View>
        <Text style={styles.amount}>Rs {item.finalAmount}</Text>
      </View>

      <View style={styles.rowBottom}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Text style={styles.paymentText}>{item.paymentStatus}</Text>
      </View>
    </View>
  );

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
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                Your placed orders will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
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
  filterBtnActive: {
    backgroundColor: "#D97706",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterLabelActive: {
    color: "#FFFFFF",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  orderMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  rowBottom: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  paymentText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
});
