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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { brand, colors, fonts } from "@/constants/theme";
import { useBusinessOwnerDashboard } from "@hooks/useBusinessOwnerDashboard";
import content from "@/content/boDashboard.json";

export default function BusinessOwnerDashboard() {
  const insets = useSafeAreaInsets();
  const {
    businessProfile,
    businessStatus,
    canToggleOrders,
    analytics,
    refreshing,
    toggleLoading,
    isTakingOrders,
    approvedProducts,
    pendingProducts,
    rejectedProducts,
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

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  const today = analytics?.daily?.[analytics.daily.length - 1];
  const ordersToday = today?.orders ?? 0;
  const revenueToday = today?.revenue ?? 0;
  const rating =
    businessProfile && typeof (businessProfile as { rating?: number }).rating === "number"
      ? (businessProfile as { rating?: number }).rating
      : null;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />
        }
      >
        <View style={[styles.homeHeader, { paddingTop: insets.top + 18 }]}>
          <View style={styles.greet}>
            <Text style={styles.greetLabel}>{greeting},</Text>
            <Text style={styles.shopName} numberOfLines={1}>
              {businessProfile?.name || content.businessFallback}
            </Text>
            <View
              style={[
                styles.statusPill,
                !businessProfile?.isVerified
                  ? styles.statusPending
                  : businessStatus === "open"
                  ? styles.statusLive
                  : styles.statusPaused,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: !businessProfile?.isVerified
                      ? "#3A8A5C"
                      : businessStatus === "open"
                      ? "#3A8A5C"
                      : "#E0A030",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: !businessProfile?.isVerified
                      ? "#3A8A5C"
                      : businessStatus === "open"
                      ? "#3A8A5C"
                      : "#92400E",
                  },
                ]}
              >
                {!businessProfile?.isVerified
                  ? "Verification pending"
                  : businessStatus === "open"
                  ? "Live"
                  : businessStatus === "paused"
                  ? "Paused"
                  : "Closed"}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View
              style={[
                styles.pauseRow,
                { backgroundColor: isTakingOrders ? brand.soft : "rgba(239,68,68,0.08)" },
              ]}
            >
              <Text style={[styles.pauseLabel, { color: isTakingOrders ? brand.primary : "#DC2626" }]}>
                {isTakingOrders ? "Orders on" : "Paused"}
              </Text>
              <Switch
                value={isTakingOrders}
                onValueChange={handleToggleTakingOrders}
                disabled={!canToggleOrders || toggleLoading}
                trackColor={{ false: "#E9E3D4", true: brand.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.bell}>
              <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
            </View>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{ordersToday}</Text>
            <Text style={styles.statLabel}>Orders today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{Math.round(revenueToday)}</Text>
            <Text style={styles.statLabel}>Revenue today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rating ? rating.toFixed(1) : "—"}</Text>
            <Text style={styles.statLabel}>Shop rating</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.quickRow}>
          {[
            { icon: "add" as const, label: "Add product", onPress: goToProducts },
            { icon: "cube-outline" as const, label: "Inventory", onPress: goToProducts },
            { icon: "time-outline" as const, label: "Timings", onPress: goToOrders },
            { icon: "storefront-outline" as const, label: "Storefront", onPress: goToProducts },
          ].map((action) => (
            <TouchableOpacity key={action.label} style={styles.quickCard} onPress={action.onPress} activeOpacity={0.85}>
              <View style={styles.quickIcon}>
                <Ionicons name={action.icon} size={16} color={brand.primary} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabelInline}>Recent orders</Text>
          <TouchableOpacity onPress={goToOrders}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyOrder}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cart-outline" size={18} color={brand.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySub}>New orders will show up here</Text>
            </View>
          </View>
        ) : (
          recentOrders.map((order) => {
            const meta = getOrderStatusMeta(order.status);
            return (
              <View key={order.id} style={styles.orderRow}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cart-outline" size={18} color={brand.accentDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyTitle}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.emptySub}>
                    {timeAgo(order.createdAt)} · {meta?.label ?? order.status}
                  </Text>
                </View>
                <Text style={styles.orderAmount}>₹{order.finalAmount}</Text>
              </View>
            );
          })
        )}

        {analytics && analytics.daily.length > 0 ? (
          <View style={styles.extraSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabelInline}>{content.sections.revenueTitle}</Text>
              <Text style={styles.viewAll}>₹{analytics.totalRevenue7d.toFixed(0)}</Text>
            </View>
            <View style={styles.chartWrap}>
              {analytics.daily.map((d) => {
                const ratio = maxRevenue > 0 ? d.revenue / maxRevenue : 0;
                const barH = Math.max(4, Math.round(ratio * 90));
                return (
                  <View key={d.date} style={styles.chartBar}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBarFill,
                          { height: barH, backgroundColor: d.revenue > 0 ? brand.primary : colors.border },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartBarLabel}>{d.date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.extraSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabelInline}>{content.sections.pipelineTitle}</Text>
            <TouchableOpacity onPress={goToProducts}>
              <Text style={styles.viewAll}>{content.sections.manage}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pipelineRow}>
            <View style={[styles.pipelineCard, { backgroundColor: brand.soft }]}>
              <Text style={[styles.pipelineValue, { color: brand.primary }]}>{approvedProducts}</Text>
              <Text style={[styles.pipelineLabel, { color: brand.primary }]}>{content.pipeline.approved}</Text>
            </View>
            <View style={[styles.pipelineCard, { backgroundColor: brand.accentSoft }]}>
              <Text style={[styles.pipelineValue, { color: brand.accentDark }]}>{pendingProducts}</Text>
              <Text style={[styles.pipelineLabel, { color: brand.accentDark }]}>{content.pipeline.pending}</Text>
            </View>
            <View style={[styles.pipelineCard, { backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.pipelineValue, { color: "#991B1B" }]}>{rejectedProducts}</Text>
              <Text style={[styles.pipelineLabel, { color: "#991B1B" }]}>{content.pipeline.rejected}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.creamAlt,
  },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  greet: {
    flex: 1,
    marginRight: 12,
  },
  greetLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: brand.muted,
  },
  shopName: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPending: { backgroundColor: brand.soft },
  statusLive: { backgroundColor: brand.soft },
  statusPaused: { backgroundColor: brand.accentSoft },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: fonts.uiBold,
    fontSize: 10.5,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  pauseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingLeft: 10,
    gap: 4,
  },
  pauseLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
  },
  bell: {
    width: 33,
    height: 33,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 3,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: brand.primary,
  },
  statLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: brand.muted,
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionLabelInline: {
    fontFamily: fonts.uiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  viewAll: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: brand.accentDark,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: brand.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptyOrder: {
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderRow: {
    marginHorizontal: 22,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: brand.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  emptySub: {
    fontFamily: fonts.ui,
    fontSize: 11.5,
    color: brand.muted,
    marginTop: 2,
  },
  orderAmount: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: brand.primary,
  },
  extraSection: {
    marginTop: 8,
  },
  chartWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 22,
    gap: 4,
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    gap: 4,
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
    fontFamily: fonts.uiSemiBold,
    fontSize: 9,
    color: brand.muted,
  },
  pipelineRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    gap: 10,
  },
  pipelineCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  pipelineValue: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  pipelineLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
  },
});
