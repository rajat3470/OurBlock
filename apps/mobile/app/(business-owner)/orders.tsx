import React, { useEffect, useMemo, useState } from "react";
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
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { Order, OrderStatus } from "../../src/types";

type FilterKey = "all" | "pending" | "active" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

const DONE_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const nextStatus = (status: OrderStatus): OrderStatus | null => {
  switch (status) {
    case OrderStatus.PENDING:
      return OrderStatus.CONFIRMED;
    case OrderStatus.CONFIRMED:
      return OrderStatus.PREPARING;
    case OrderStatus.PREPARING:
      return OrderStatus.READY;
    case OrderStatus.READY:
      return OrderStatus.OUT_FOR_DELIVERY;
    case OrderStatus.OUT_FOR_DELIVERY:
      return OrderStatus.DELIVERED;
    default:
      return null;
  }
};

export default function BusinessOwnerOrders() {
  const { orders, isLoading, loadOrders, changeOrderStatus } = useBusinessOwner();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    loadOrders().catch(() => null);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "pending") {
      return orders.filter((item) => item.status === OrderStatus.PENDING);
    }

    if (activeFilter === "active") {
      return orders.filter((item) => ACTIVE_STATUSES.includes(item.status));
    }

    if (activeFilter === "done") {
      return orders.filter((item) => DONE_STATUSES.includes(item.status));
    }

    return orders;
  }, [activeFilter, orders]);

  const handleAdvance = async (order: Order) => {
    const status = nextStatus(order.status);
    if (!status) {
      return;
    }

    try {
      await changeOrderStatus(order.id, status);
    } catch {
      Alert.alert("Error", "Failed to update order status.");
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const next = nextStatus(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.orderMeta}>
              {item.items.length} items · {item.paymentMethod.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.amount}>Rs {item.finalAmount}</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.paymentStatus}>{item.paymentStatus}</Text>
        </View>

        {next ? (
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={() => handleAdvance(item)}
          >
            <Text style={styles.advanceText}>Advance to {next}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader title="Orders" subtitle="Track and fulfill orders" />

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
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No orders in this view</Text>
              <Text style={styles.emptySubtitle}>
                Orders will appear here once customers place them.
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
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  filterBtnActive: {
    backgroundColor: "#16A34A",
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
    padding: 14,
    paddingBottom: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
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
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  paymentStatus: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  advanceBtn: {
    marginTop: 10,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  advanceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
