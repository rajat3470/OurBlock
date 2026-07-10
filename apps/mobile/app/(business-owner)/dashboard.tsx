import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gradients } from "@/constants/theme";
import { useBusinessOwnerDashboard } from "@hooks/useBusinessOwnerDashboard";
import content from "@/content/boDashboard.json";

export default function BusinessOwnerDashboard() {
  const insets = useSafeAreaInsets();
  const {
    user,
    businessProfile,
    analytics,
    refreshing,
    toggleLoading,
    isTakingOrders,
    approvedProducts,
    pendingProducts,
    rejectedProducts,
    totalProducts,
    activeOrders,
    deliveredOrders,
    totalOrders,
    maxRevenue,
    recentOrders,
    loading,
    greeting,
    onRefresh,
    handleToggleTakingOrders,
    goToProducts,
    goToOrders,
    getOrderStatusMeta,
    timeAgo,
  } = useBusinessOwnerDashboard();

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
                {greeting}, {user?.firstName || content.ownerFallback} 👋
              </Text>
              <Text style={styles.heroBusinessName} numberOfLines={1}>
                {businessProfile?.name || content.businessFallback}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <View
                style={[
                  styles.verifiedPill,
                  !businessProfile?.isVerified
                    ? styles.verifiedPillPending
                    : isTakingOrders
                    ? styles.verifiedPillLive
                    : styles.verifiedPillPaused,
                ]}
              >
                <Text
                  style={[
                    styles.verifiedPillText,
                    { color: businessProfile?.isVerified ? "#FFFFFF" : "#92400E" },
                  ]}
                >
                  {!businessProfile?.isVerified
                    ? content.pills.pending
                    : isTakingOrders
                    ? content.pills.live
                    : content.pills.paused}
                </Text>
              </View>
              {/* Pause / Resume toggle */}
              <View style={[styles.pauseRow, { backgroundColor: isTakingOrders ? "rgba(255,255,255,0.12)" : "rgba(252,165,165,0.15)" }]}>
                <Text style={[styles.pauseLabel, { color: isTakingOrders ? "#FFFFFF" : "#FCA5A5" }]}>{isTakingOrders ? content.pills.takingOrders : content.pills.pausedLabel}</Text>
                <Switch
                  value={isTakingOrders}
                  onValueChange={handleToggleTakingOrders}
                  disabled={toggleLoading}
                  trackColor={{ false: "rgba(255,255,255,0.3)", true: "#4ADE80" }}
                  thumbColor={isTakingOrders ? "#FFFFFF" : "#FECACA"}
                  ios_backgroundColor="rgba(255,255,255,0.3)"
                  style={{ opacity: toggleLoading ? 0.6 : 1 }}
                />
              </View>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalProducts}</Text>
              <Text style={styles.heroStatLabel}>{content.heroStats.products}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeOrders}</Text>
              <Text style={styles.heroStatLabel}>{content.heroStats.active}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{deliveredOrders}</Text>
              <Text style={styles.heroStatLabel}>{content.heroStats.delivered}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalOrders}</Text>
              <Text style={styles.heroStatLabel}>{content.heroStats.allOrders}</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#16A34A" />
          </View>
        ) : (
          <>
            {/* ── Revenue Chart ──────────────────────────────────────── */}
            {analytics && analytics.daily.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{content.sections.revenueTitle}</Text>
                  <Text style={styles.sectionSubtitle}>{content.currency}{analytics.totalRevenue7d.toFixed(0)}</Text>
                </View>
                <View style={styles.chartWrap}>
                  {analytics.daily.map((d) => {
                    const ratio = maxRevenue > 0 ? d.revenue / maxRevenue : 0;
                    const barH = Math.max(4, Math.round(ratio * 90));
                    const label = d.date.slice(5); // "MM-DD"
                    return (
                      <View key={d.date} style={styles.chartBar}>
                        <Text style={styles.chartBarValue}>{d.revenue > 0 ? `${content.currency}${d.revenue}` : ""}</Text>
                        <View style={styles.chartBarTrack}>
                          <View style={[styles.chartBarFill, { height: barH, backgroundColor: d.revenue > 0 ? "#16A34A" : "#E2E8F0" }]} />
                        </View>
                        <Text style={styles.chartBarLabel}>{label}</Text>
                        <Text style={styles.chartBarOrders}>{d.orders > 0 ? `${d.orders}` : ""}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* ── Popular Items ─────────────────────────────────────── */}
            {analytics && analytics.popularItems.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{content.sections.popularTitle}</Text>
                </View>
                {analytics.popularItems.map((item, idx) => (
                  <View key={item.productId} style={styles.popularRow}>
                    <View style={[styles.popularRank, { backgroundColor: idx === 0 ? "#FEF3C7" : "#F1F5F9" }]}>
                      <Text style={[styles.popularRankText, { color: idx === 0 ? "#D97706" : "#64748B" }]}>
                        #{idx + 1}
                      </Text>
                    </View>
                    <Text style={styles.popularName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.popularRight}>
                      <Text style={styles.popularCount}>{item.count}{content.sections.soldSuffix}</Text>
                      <Text style={styles.popularRevenue}>{content.currency}{item.revenue}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── Product Pipeline ─────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{content.sections.pipelineTitle}</Text>
                <TouchableOpacity onPress={goToProducts} activeOpacity={0.7}>
                  <Text style={styles.sectionLink}>{content.sections.manage}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pipelineRow}>
                <View style={[styles.pipelineCard, { backgroundColor: "#DCFCE7" }]}>
                  <Text style={styles.pipelineEmoji}>✅</Text>
                  <Text style={[styles.pipelineValue, { color: "#166534" }]}>{approvedProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#166534" }]}>{content.pipeline.approved}</Text>
                </View>
                <View style={[styles.pipelineCard, { backgroundColor: "#FFFBEB" }]}>
                  <Text style={styles.pipelineEmoji}>⏳</Text>
                  <Text style={[styles.pipelineValue, { color: "#92400E" }]}>{pendingProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#92400E" }]}>{content.pipeline.pending}</Text>
                </View>
                <View style={[styles.pipelineCard, { backgroundColor: "#FEF2F2" }]}>
                  <Text style={styles.pipelineEmoji}>✗</Text>
                  <Text style={[styles.pipelineValue, { color: "#991B1B" }]}>{rejectedProducts}</Text>
                  <Text style={[styles.pipelineLabel, { color: "#991B1B" }]}>{content.pipeline.rejected}</Text>
                </View>
              </View>
            </View>

            {/* ── Recent Orders ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{content.sections.recentTitle}</Text>
                <TouchableOpacity onPress={goToOrders} activeOpacity={0.7}>
                  <Text style={styles.sectionLink}>{content.sections.viewAll}</Text>
                </TouchableOpacity>
              </View>

              {recentOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>{content.empty.emoji}</Text>
                  <Text style={styles.emptyTitle}>{content.empty.title}</Text>
                  <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
                </View>
              ) : (
                recentOrders.map((order) => {
                  const meta = getOrderStatusMeta(order.status);
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
                        <Text style={styles.orderCardAmount}>{content.currency}{order.finalAmount}</Text>
                      </View>

                      {addressLine ? (
                        <Text style={styles.orderCardAddress} numberOfLines={1}>
                          📍 {addressLine}
                        </Text>
                      ) : null}

                      <Text style={styles.orderCardItems} numberOfLines={1}>
                        🛍 {order.items.slice(0, 3).map((i) => `×${i.quantity}`).join("  ")} · {order.items.length} {order.items.length !== 1 ? content.order.itemPlural : content.order.itemSingular}
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
                            {order.paymentMethod.toUpperCase()} · {order.paymentStatus === "completed" ? content.order.paid : content.order.pending}
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
  verifiedPillPaused: {
    backgroundColor: "rgba(251,146,60,0.22)",
    borderWidth: 1,
    borderColor: "rgba(251,146,60,0.45)",
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

  // ── Pause toggle row
  pauseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  pauseLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Revenue Chart
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
  },
  chartWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  chartBarValue: {
    fontSize: 8,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    minHeight: 12,
  },
  chartBarTrack: {
    width: "100%",
    height: 96,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  chartBarFill: {
    width: "70%",
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
  },
  chartBarOrders: {
    fontSize: 9,
    color: "#16A34A",
    fontWeight: "600",
    minHeight: 12,
  },

  // ── Popular Items
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  popularRank: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  popularRankText: {
    fontSize: 11,
    fontWeight: "800",
  },
  popularName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  popularRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  popularCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  popularRevenue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
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
