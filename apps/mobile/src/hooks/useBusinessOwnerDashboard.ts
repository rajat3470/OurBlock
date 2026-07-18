import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@hooks/useRedux";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { getBusinessStatus } from "@utils/businessStatus";
import { OrderStatus } from "@/types";
import content from "@/content/boDashboard.json";

type StatusStyle = { color: string; bg: string; emoji: string; labelKey: keyof typeof content.statusLabels };

const STATUS_STYLE: Record<string, StatusStyle> = {
  [OrderStatus.PENDING]: { color: "#D97706", bg: "#FFFBEB", emoji: "⏳", labelKey: "pending" },
  [OrderStatus.CONFIRMED]: { color: "#2563EB", bg: "#EFF6FF", emoji: "✅", labelKey: "confirmed" },
  [OrderStatus.PREPARING]: { color: "#7C3AED", bg: "#F5F3FF", emoji: "🍳", labelKey: "preparing" },
  [OrderStatus.READY]: { color: "#059669", bg: "#ECFDF5", emoji: "📦", labelKey: "ready" },
  [OrderStatus.OUT_FOR_DELIVERY]: { color: "#0284C7", bg: "#F0F9FF", emoji: "🚚", labelKey: "outForDelivery" },
  [OrderStatus.DELIVERED]: { color: "#16A34A", bg: "#DCFCE7", emoji: "🎉", labelKey: "delivered" },
  [OrderStatus.CANCELLED]: { color: "#DC2626", bg: "#FEF2F2", emoji: "✗", labelKey: "cancelled" },
};

export function getOrderStatusMeta(status: string) {
  const style = STATUS_STYLE[status];
  if (!style) return null;
  return {
    label: content.statusLabels[style.labelKey],
    color: style.color,
    bg: style.bg,
    emoji: style.emoji,
  };
}

export function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export const useBusinessOwnerDashboard = () => {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const {
    businessProfile,
    orders,
    products,
    stats,
    analytics,
    isLoading,
    loadBusinessProfile,
    loadStats,
    loadProducts,
    loadAnalytics,
    toggleTakingOrders,
  } = useBusinessOwner();
  const [refreshing, setRefreshing] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const businessStatus = useMemo(
    () => (businessProfile ? getBusinessStatus(businessProfile) : null),
    [businessProfile]
  );
  const canToggleOrders = businessProfile?.status === "active";
  const isTakingOrders = canToggleOrders && businessProfile?.isTakingOrders !== false;

  // Orders are kept fresh by the Firestore listener in useBusinessOwnerRealtimeSync.
  // loadAll only fetches profile/stats/products/analytics on mount and manual refresh.
  const loadAll = useCallback(async () => {
    try {
      await Promise.all([
        loadBusinessProfile(),
        loadStats(),
        loadProducts(),
        loadAnalytics(),
      ]);
    } catch {
      /* handled in Redux slice */
    }
  }, [loadBusinessProfile, loadStats, loadProducts, loadAnalytics]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll().finally(() => setRefreshing(false));
  }, [loadAll]);

  const handleToggleTakingOrders = useCallback(
    async (val: boolean) => {
      if (toggleLoading) return;
      setToggleLoading(true);
      try {
        await toggleTakingOrders(val);
      } catch (err: unknown) {
        const apiMsg =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : null);
        const fallback = businessProfile?.isVerified
          ? content.toggleAlert.failVerified
          : content.toggleAlert.failPending;
        Alert.alert(content.toggleAlert.title, apiMsg || fallback);
      } finally {
        setToggleLoading(false);
      }
    },
    [businessProfile?.isVerified, toggleLoading, toggleTakingOrders]
  );

  const approvedProducts = products.filter((p) => (p.approvalStatus ?? "pending") === "approved").length;
  const pendingProducts = products.filter((p) => (p.approvalStatus ?? "pending") === "pending").length;
  const rejectedProducts = products.filter((p) => (p.approvalStatus ?? "pending") === "rejected").length;
  const totalProducts = stats?.totalProducts ?? products.length;

  const activeOrders = orders.filter(
    (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
  const totalOrders = orders.length;

  const maxRevenue = analytics?.daily?.reduce((m, d) => Math.max(m, d.revenue), 0) ?? 1;

  const recentOrders = useMemo(() => [...orders].slice(0, 6), [orders]);
  const loading = isLoading || !businessProfile;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return content.greetings.morning;
    if (h < 17) return content.greetings.afternoon;
    return content.greetings.evening;
  }, []);

  const goToProducts = useCallback(() => router.push("/(business-owner)/products"), [router]);
  const goToOrders = useCallback(() => router.push("/(business-owner)/orders"), [router]);

  return {
    user,
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
  };
};
