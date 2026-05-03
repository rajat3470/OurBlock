import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AppSectionHeader from "../../src/components/AppSectionHeader";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { OrderStatus } from "../../src/types";

interface InsightCardProps {
  emoji: string;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}

function InsightCard({ emoji, label, value, color, bgColor }: InsightCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}> 
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

export default function BusinessOwnerDashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const {
    businessProfile,
    orders,
    products,
    stats,
    isLoading,
    loadBusinessProfile,
    loadStats,
    loadOrders,
    loadProducts,
  } = useBusinessOwner();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          loadBusinessProfile(),
          loadStats(),
          loadOrders(),
          loadProducts(),
        ]);
      } catch {
        // Errors are already handled and stored in Redux slice.
      }
    };

    loadAll();
  }, [loadBusinessProfile, loadOrders, loadProducts, loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadBusinessProfile(),
        loadStats(),
        loadOrders(),
        loadProducts(),
      ]);
    } catch {
      // Errors are already handled and stored in Redux slice.
    } finally {
      setRefreshing(false);
    }
  };

  const activeOrders = orders.filter(
    (order) =>
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
  ).length;

  const lowStockCount = products.filter((product) => product.stock <= 5).length;

  const cards: InsightCardProps[] = [
    {
      emoji: "📦",
      label: "Products",
      value: stats?.totalProducts ?? products.length,
      color: "#16A34A",
      bgColor: "#ECFDF5",
    },
    {
      emoji: "🧾",
      label: "Orders",
      value: stats?.totalOrders ?? orders.length,
      color: "#2563EB",
      bgColor: "#EFF6FF",
    },
    {
      emoji: "⏳",
      label: "Active Orders",
      value: stats?.pendingOrders ?? activeOrders,
      color: "#D97706",
      bgColor: "#FFFBEB",
    },
    {
      emoji: "⚠️",
      label: "Low Stock",
      value: stats?.lowStockProducts ?? lowStockCount,
      color: "#DC2626",
      bgColor: "#FEF2F2",
    },
  ];

  const recentOrders = [...orders].slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <AppSectionHeader
        title={`${user?.firstName || "Owner"} 👋`}
        subtitle={businessProfile?.name || "Business Owner Dashboard"}
        badge="Owner"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
          />
        }
      >
        <Text style={styles.sectionTitle}>Store Insights</Text>
        {isLoading && !stats && orders.length === 0 && products.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {cards.map((card) => (
              <InsightCard key={card.label} {...card} />
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              New customer orders will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.orderList}>
            {recentOrders.map((order) => (
              <View key={order.id} style={styles.orderRow}>
                <View style={styles.orderLeft}>
                  <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                  <Text style={styles.orderMeta}>
                    {order.items.length} items · {order.paymentMethod.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>Rs {order.finalAmount}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  orderList: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: "hidden",
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  orderLeft: {
    flex: 1,
  },
  orderRight: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  orderMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  orderStatus: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  bottomPad: {
    height: 22,
  },
});
