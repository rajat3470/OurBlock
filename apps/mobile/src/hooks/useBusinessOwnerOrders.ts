import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Vibration, AppState } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { Order, OrderStatus } from "@/types";
import {
  getAcceptanceDeadlineMs,
  effectiveOrderStatus,
  toMillis,
} from "@utils/orderAcceptance";
import { useAppDispatch } from "@hooks/useRedux";
import { prependOrder } from "@store/slices/businessOwnerSlice";
import { useSocketEvent } from "@hooks/useSocket";
import { socketService } from "@services/socketService";
import content from "@/content/boOrders.json";

export type FilterKey = "all" | "pending" | "active" | "done";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

const DONE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED];

type StatusStyle = { color: string; bg: string; emoji: string; border: string; labelKey: keyof typeof content.statusLabels };

const STATUS_STYLE: Record<string, StatusStyle> = {
  [OrderStatus.PENDING]: { color: "#D97706", bg: "#FFFBEB", emoji: "🔔", border: "#FDE68A", labelKey: "pending" },
  [OrderStatus.CONFIRMED]: { color: "#2563EB", bg: "#EFF6FF", emoji: "✅", border: "#BFDBFE", labelKey: "confirmed" },
  [OrderStatus.PREPARING]: { color: "#7C3AED", bg: "#F5F3FF", emoji: "⚙️", border: "#DDD6FE", labelKey: "preparing" },
  [OrderStatus.READY]: { color: "#059669", bg: "#ECFDF5", emoji: "📦", border: "#A7F3D0", labelKey: "ready" },
  [OrderStatus.OUT_FOR_DELIVERY]: { color: "#0284C7", bg: "#F0F9FF", emoji: "🚚", border: "#BAE6FD", labelKey: "outForDelivery" },
  [OrderStatus.DELIVERED]: { color: "#16A34A", bg: "#DCFCE7", emoji: "🎉", border: "#86EFAC", labelKey: "delivered" },
  [OrderStatus.CANCELLED]: { color: "#DC2626", bg: "#FEF2F2", emoji: "✗", border: "#FECACA", labelKey: "cancelled" },
  [OrderStatus.REJECTED]: { color: "#991B1B", bg: "#FEF2F2", emoji: "🚫", border: "#FECACA", labelKey: "rejected" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
};

const NEXT_STATUS_LABEL_KEY: Partial<Record<OrderStatus, keyof typeof content.nextStatusLabels>> = {
  [OrderStatus.CONFIRMED]: "confirmed",
  [OrderStatus.PREPARING]: "preparing",
  [OrderStatus.READY]: "ready",
  [OrderStatus.OUT_FOR_DELIVERY]: "outForDelivery",
};

export function getOrderStatusMeta(status: string) {
  const style = STATUS_STYLE[status];
  if (!style) return null;
  return {
    label: content.statusLabels[style.labelKey],
    color: style.color,
    bg: style.bg,
    emoji: style.emoji,
    border: style.border,
  };
}

export function getNextStatus(status: OrderStatus) {
  return NEXT_STATUS[status];
}

export function getNextStatusLabel(status: OrderStatus) {
  const key = NEXT_STATUS_LABEL_KEY[status];
  return key ? content.nextStatusLabels[key] : undefined;
}

function normalizeOrderPayload(payload: any): Order | null {
  const raw = payload?.order ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id && raw._id) {
    return { ...raw, id: raw._id } as Order;
  }
  return raw as Order;
}

export function timeAgo(date: unknown): string {
  const ms = toMillis(date);
  if (ms == null) return "";
  const diffMs = Date.now() - ms;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/**
 * Encapsulates all logic for the business owner orders screen: order loading,
 * socket + fallback polling, auto-rejection tickers, and order lifecycle
 * actions (accept, advance, reject).
 */
export const useBusinessOwnerOrders = () => {
  const { orders, isLoading, loadOrders, changeOrderStatus, rejectOrder } = useBusinessOwner();
  const { rejectOrderId } = useLocalSearchParams<{ rejectOrderId?: string }>();
  const dispatch = useAppDispatch();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderRef: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());

  const getFallbackDelayMs = useCallback(() => {
    const elapsed = Date.now() - lastActivityAtRef.current;
    if (elapsed < 30_000) return 3_000;
    if (elapsed < 180_000) return 10_000;
    return 30_000;
  }, []);

  const refreshFallbackNow = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    if (!socketService.isConnected()) {
      loadOrders({ silent: true }).catch(() => null);
    }
  }, [loadOrders]);

  const stopFallbackLoop = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const startFallbackLoop = useCallback(() => {
    stopFallbackLoop();

    const tick = () => {
      if (!socketService.isConnected()) {
        loadOrders({ silent: true }).catch(() => null);
      }
      fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
    };

    fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
  }, [getFallbackDelayMs, loadOrders, stopFallbackLoop]);

  const prevPendingCount = useRef<number>(0);

  useEffect(() => {
    loadOrders().catch(() => null);
  }, [loadOrders]);

  const hasPending = useMemo(
    () => orders.some((o) => o.status === OrderStatus.PENDING),
    [orders]
  );
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => {
      loadOrders({ silent: true }).catch(() => null);
    }, 3000);
    return () => clearInterval(timer);
  }, [hasPending, loadOrders]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  useFocusEffect(
    useCallback(() => {
      refreshFallbackNow();
      startFallbackLoop();

      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          refreshFallbackNow();
        }
      });

      return () => {
        sub.remove();
        stopFallbackLoop();
      };
    }, [refreshFallbackNow, startFallbackLoop, stopFallbackLoop])
  );

  useSocketEvent<any>("order:new", (payload) => {
    const order = normalizeOrderPayload(payload);
    if (!order?.id) return;
    dispatch(prependOrder(order));
  });

  const playNewOrderAlert = useCallback(async () => {
    try {
      Vibration.vibrate([0, 400, 200, 400, 200, 600]);
    } catch {
      Vibration.vibrate([0, 300, 200, 300]);
    }
  }, []);

  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === OrderStatus.PENDING).length;
    if (pendingCount > prevPendingCount.current) {
      playNewOrderAlert();
    }
    prevPendingCount.current = pendingCount;
  }, [orders, playNewOrderAlert]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((o) => effectiveOrderStatus(o, now) === OrderStatus.PENDING).length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(effectiveOrderStatus(o, now))).length,
      done: orders.filter((o) => DONE_STATUSES.includes(effectiveOrderStatus(o, now))).length,
    }),
    [orders, now]
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === "pending")
      return orders.filter((o) => effectiveOrderStatus(o, now) === OrderStatus.PENDING);
    if (activeFilter === "active")
      return orders.filter((o) => ACTIVE_STATUSES.includes(effectiveOrderStatus(o, now)));
    if (activeFilter === "done")
      return orders.filter((o) => DONE_STATUSES.includes(effectiveOrderStatus(o, now)));
    return orders;
  }, [activeFilter, orders, now]);

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: content.filters.all, count: counts.all },
    { key: "pending", label: content.filters.pending, count: counts.pending },
    { key: "active", label: content.filters.active, count: counts.active },
    { key: "done", label: content.filters.done, count: counts.done },
  ];

  const handleAdvance = useCallback(
    async (order: Order) => {
      const next = NEXT_STATUS[order.status];
      if (!next) return;
      setAdvancing(order.id);
      try {
        await changeOrderStatus(order.id, next);
        refreshFallbackNow();
      } catch {
        Alert.alert(content.alerts.errorTitle, content.alerts.advanceFail);
      } finally {
        setAdvancing(null);
      }
    },
    [changeOrderStatus, refreshFallbackNow]
  );

  const markExpired = useCallback((orderId: string) => {
    setExpiredIds((prev) => {
      if (prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  }, []);

  const handleCountdownExpire = useCallback(
    (orderId: string) => {
      markExpired(orderId);
      loadOrders({ silent: true }).catch(() => null);
    },
    [markExpired, loadOrders]
  );

  const handleAccept = useCallback(
    async (order: Order) => {
      setAdvancing(order.id);
      try {
        await changeOrderStatus(order.id, OrderStatus.CONFIRMED);
        refreshFallbackNow();
      } catch (err) {
        const code = (err as any)?.response?.data?.code;
        const httpStatus = (err as any)?.response?.status;
        if (code === "ACCEPTANCE_WINDOW_EXPIRED" || code === "ORDER_NOT_PENDING" || httpStatus === 409) {
          markExpired(order.id);
          refreshFallbackNow();
          Alert.alert(content.alerts.expiredTitle, content.alerts.expiredMsg);
        } else {
          Alert.alert(content.alerts.errorTitle, content.alerts.acceptFail);
        }
      } finally {
        setAdvancing(null);
      }
    },
    [changeOrderStatus, markExpired, refreshFallbackNow]
  );

  const openRejectModal = useCallback((order: Order) => {
    setRejectReason("");
    setRejectModal({ orderId: order.id, orderRef: order.id.slice(0, 8).toUpperCase() });
  }, []);

  useEffect(() => {
    if (!rejectOrderId || typeof rejectOrderId !== "string") return;
    const order = orders.find((o) => o.id === rejectOrderId);
    if (!order || order.status !== OrderStatus.PENDING) return;
    openRejectModal(order);
    router.setParams({ rejectOrderId: undefined });
  }, [rejectOrderId, orders, openRejectModal]);

  const handleReject = useCallback(async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      Alert.alert(content.rejectModal.reasonRequiredTitle, content.rejectModal.reasonRequiredMsg);
      return;
    }

    setRejecting(true);
    try {
      await rejectOrder(rejectModal.orderId, rejectReason.trim());
      setRejectModal(null);
      setRejectReason("");
      refreshFallbackNow();
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.rejectFail);
    } finally {
      setRejecting(false);
    }
  }, [rejectModal, rejectReason, rejectOrder, refreshFallbackNow]);

  const goToOrderDetail = useCallback((orderId: string) => {
    router.push(`/(business-owner)/order-detail?orderId=${orderId}`);
  }, []);

  return {
    orders,
    isLoading,
    activeFilter,
    setActiveFilter,
    advancing,
    rejectModal,
    setRejectModal,
    rejectReason,
    setRejectReason,
    rejecting,
    expiredIds,
    now,
    filteredOrders,
    filters,
    handleAdvance,
    handleAccept,
    handleReject,
    handleCountdownExpire,
    openRejectModal,
    goToOrderDetail,
    effectiveOrderStatus,
    getAcceptanceDeadlineMs,
    getOrderStatusMeta,
    getNextStatus,
    getNextStatusLabel,
    timeAgo,
  };
};
