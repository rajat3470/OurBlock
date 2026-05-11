import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppSelector } from "../../src/hooks/useRedux";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { OrderStatus } from "../../src/types";
import { gradients } from "../../src/constants/theme";

const ORDER_STATUS_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  [OrderStatus.PENDING]:          { label: "Pending",          color: "#D97706", bg: "#FFFBEB", emoji: "⏳" },
  [OrderStatus.CONFIRMED]:        { label: "Confirmed",        color: "#2563EB", bg: "#EFF6FF", emoji: "✅" },
  [OrderStatus.PREPARING]:        { label: "Preparing",        color: "#7C3AED", bg: "#F5F3FF", emoji: "🍳" },
  [OrderStatus.READY]:            { label: "Ready",            color: "#059669", bg: "#ECFDF5", emoji: "📦" },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: "Out for Delivery", color: "#0284C7", bg: "#F0F9FF", emoji: "🚚" },
  [OrderStatus.DELIVERED]:        { label: "Delivered",        color: "#16A34A", bg: "#DCFCE7", emoji: "🎉" },
  [OrderStatus.CANCELLED]:        { label: "Cancelled",        color: "#DC2626", bg: "#FEF2F2", emoji: "✗"  },
};

function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function BusinessOwnerDashboard() {
  const router = useRouter();
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

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([
        loadBusinessProfile(),
        loadStats(),
        loadOrders(),
        loadProducts(),
      ]);
    } catch { /* handled in Redux slice */ }
  }, [loadBusinessProfile, loadStats, loadOrders, loadProducts]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll().finally(() => setRefreshing(false));
  };

  const approvedProducts  = products.filter((p) => (p.approvalStatus ?? "pending") === "approved").length;
  const pendingProducts   = products.filter((p) => (p.approvalStatus ?? "pending") === "pending").length;
  const rejectedProducts  = products.filter((p) => (p.approvalStatus ?? "pending") === "rejected").length;
  const totalProducts     = stats?.totalProducts ?? products.length;

  const activeOrders    = orders.filter((o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED).length;
  const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
  const totalOrders     = stats?.totalOrders ?? orders.length;

  const recentOrders = [...orders].slice(0, 6);
  const loading = isLoading && !stats && orders.length === 0 && products.length === 0;
  const insets = useSafeAreaInsets();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <LinearGradient colors={[...gradients.businessOwner]} style={[styles.hero, { paddingTop: insets.top + 22 }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroGreeting}>
                {greeting}, {user?.firstName || "Owner"} 👋
              </Text>
              <Text style={styles.heroBusinessName} numberOfLines={1}>
                {businessProfile?.name || "Your Business"}
              </Text>
            </View>
            <View
              style={[
                styles.verifiedPill,
                businessProfile?.isVerified ? styles.verifiedPillLive : styles.verifiedPillPending,
              ]}
            >
              <Text
                style={[
                  styles.verifiedPillText,
                  { color: businessProfile?.isVerified ? "#FFFFFF" : "#92400E" },
                ]}
              >
                {businessProfile?.isVerified ? "✓ Live" : "⏳ Pending"}
              </Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalProducts}</Text>
              <Text style={styles.heroStatLabel}>Products</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeOrders}</Text>
              <Text style={styles.heroStatLabel}>Active</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{deliveredOrders}</Text>
              <Text style={styles.heroStatLabel}>Delivered</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalOrders}</Text>
              <Text style={styles.heroStatLabel}>All Orders</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <>
            {/* ── Product Pipeline ─────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Product Pipeline</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(business-owner)/products")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionLink}>Manage →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pipelineRow}>
                <View style={[styles.pipelineCard, { backgroundColor: "#DCFCE7" }]}>
                  <Text style={styles.pipelineEmoji}>✅</Text>
                  <Text style={[styles.pipelineValue, { color: "#166534" }]}>{approvedProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#166534" }]}>Approved</Text>
                </View>
                <View style={[styles.pipelineCard, { backgroundColor: "#FFFBEB" }]}>
                  <Text style={styles.pipelineEmoji}>⏳</Text>
                  <Text style={[styles.pipelineValue, { color: "#92400E" }]}>{pendingProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#92400E" }]}>Pending</Text>
                </View>
                <View style={[styles.pipelineCard, { backgroundColor: "#FEF2F2" }]}>
                  <Text style={styles.pipelineEmoji}>✗</Text>
                  <Text style={[styles.pipelineValue, { color: "#991B1B" }]}>{rejectedProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#991B1B" }]}>Rejected</Text>
                </View>
              </View>
            </View>

            {/* ── Recent Orders ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(business-owner)/orders")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionLink}>View all →</Text>
                </TouchableOpacity>
              </View>

              {recentOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🛍️</Text>
                  <Text style={styles.emptyTitle}>No orders yet</Text>
                  <Text style={styles.emptySubtitle}>
                    New customer orders will appear here.
                  </Text>
                </View>
              ) : (
                recentOrders.map((order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  const addr = order.deliveryAddress;
                  const addressLine = addr
                    ? [addr.street, addr.landmark].filter(Boolean).join(", ")
                    : null;
                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardTop}>
                        <View>
                          <Text style={styles.orderCardId}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={styles.orderCardTime}>
                            {timeAgo(order.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.orderCardAmount}>₹{order.finalAmount}</Text>
                      </View>

                      {addressLine ? (
                        <Text style={styles.orderCardAddress} numberOfLines={1}>
                          📍 {addressLine}
                        </Text>
                      ) : null}

                      <Text style={styles.orderCardItems} numberOfLines={1}>
                        🛍 {order.items.slice(0, 3).map((i) => `×${i.quantity}`).join("  ")} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </Text>

                      <View style={styles.orderCardFooter}>
                        <View style={[styles.statusPill, { backgroundColor: meta?.bg ?? "#F1F5F9" }]}>
                          <Text style={[styles.statusPillText, { color: meta?.color ?? "#64748B" }]}>
                            {meta?.emoji} {meta?.label ?? order.status}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.paymentPill,
                            order.paymentStatus === "completed"
                              ? styles.paymentPillPaid
                              : styles.paymentPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.paymentPillText,
                              { color: order.paymentStatus === "completed" ? "#166534" : "#92400E" },
                            ]}
                          >
                            {order.paymentMethod.toUpperCase()} · {order.paymentStatus === "completed" ? "Paid" : "Pending"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  // ── Hero
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  heroLeft: { flex: 1, marginRight: 12 },
  heroGreeting: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },
  heroBusinessName: {
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  verifiedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  verifiedPillLive: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  verifiedPillPending: {
    backgroundColor: "#FEF3C7",
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 4,
  },

  loaderWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },

  // ── Sections
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },

  // ── Product Pipeline
  pipelineRow: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
  },
  pipelineCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  pipelineEmoji: { fontSize: 20 },
  pipelineValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  pipelineLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Order Cards
  orderCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 6,
  },
  orderCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderCardId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  orderCardTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  orderCardAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  orderCardAddress: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  orderCardItems: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  orderCardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  paymentPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentPillPaid: { backgroundColor: "#DCFCE7" },
  paymentPillPending: { backgroundColor: "#FEF3C7" },
  paymentPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Empty
  emptyCard: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  bottomPad: { height: 130 },
});
