import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Vibration } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import {
  getAcceptanceDeadlineMs,
  effectiveOrderStatus,
  toMillis,
} from "@utils/orderAcceptance";
import { Order, OrderStatus } from "@/types";
import content from "@/content/boOrders.json";
import { businessOwnerService } from "@services/businessOwnerService";
import { promptDeliveryPartnerSelection } from "@utils/promptDeliveryPartnerSelection";

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

export const useBusinessOwnerOrders = () => {
  const { orders, isLoading, changeOrderStatus, rejectOrder, assignDeliveryPartner } =
    useBusinessOwner();
  const { rejectOrderId } = useLocalSearchParams<{ rejectOrderId?: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderRef: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const prevPendingCount = useRef<number>(0);

  // Local ticker so pending order countdown updates every second
  const hasPending = useMemo(
    () => orders.some((o) => o.status === OrderStatus.PENDING),
    [orders]
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  const playNewOrderAlert = useCallback(() => {
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

      let deliveryPartnerId: string | undefined;
      if (next === OrderStatus.OUT_FOR_DELIVERY) {
        try {
          const partners = (await businessOwnerService.getDeliveryPartners()).filter(
            (p) => p.status === "active"
          );
          const picked = await promptDeliveryPartnerSelection(partners, {
            preselectedId: order.assignedDeliveryPartnerId,
            title: content.alerts.partnerRequiredTitle,
            message: content.alerts.partnerRequiredMsg,
          });
          if (!picked) return;
          deliveryPartnerId = picked;
        } catch {
          Alert.alert(content.alerts.errorTitle, content.alerts.advanceFail);
          return;
        }
      }

      setAdvancing(order.id);
      try {
        await changeOrderStatus(
          order.id,
          next,
          deliveryPartnerId ? { deliveryPartnerId } : undefined
        );
      } catch (err: any) {
        if (err?.response?.data?.code === "DELIVERY_PARTNER_REQUIRED") {
          Alert.alert(content.alerts.partnerRequiredTitle, content.alerts.partnerRequiredMsg);
        } else {
          Alert.alert(content.alerts.errorTitle, content.alerts.advanceFail);
        }
      } finally {
        setAdvancing(null);
      }
    },
    [changeOrderStatus]
  );

  /** Repair orders that were sent out without an assignment (older API). */
  const handleAssignMissingPartner = useCallback(
    async (order: Order) => {
      if (order.assignedDeliveryPartnerId) return;
      try {
        const partners = (await businessOwnerService.getDeliveryPartners()).filter(
          (p) => p.status === "active"
        );
        const picked = await promptDeliveryPartnerSelection(partners, {
          title: content.alerts.partnerRequiredTitle,
          message: content.alerts.partnerRequiredMsg,
        });
        if (!picked) return;
        setAdvancing(order.id);
        await assignDeliveryPartner(order.id, picked);
      } catch {
        Alert.alert(content.alerts.errorTitle, content.alerts.advanceFail);
      } finally {
        setAdvancing(null);
      }
    },
    [assignDeliveryPartner]
  );

  const markExpired = useCallback((orderId: string) => {
    setExpiredIds((prev) => {
      if (prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  }, []);

  // Firestore listener will deliver the auto-rejection when the backend writes it.
  // We only mark it expired locally so the UI reflects it immediately on the client clock.
  const handleCountdownExpire = useCallback(
    (orderId: string) => markExpired(orderId),
    [markExpired]
  );

  const handleAccept = useCallback(
    async (order: Order) => {
      setAdvancing(order.id);
      try {
        await changeOrderStatus(order.id, OrderStatus.CONFIRMED);
      } catch (err) {
        const code = (err as any)?.response?.data?.code;
        const httpStatus = (err as any)?.response?.status;
        if (code === "ACCEPTANCE_WINDOW_EXPIRED" || code === "ORDER_NOT_PENDING" || httpStatus === 409) {
          markExpired(order.id);
          Alert.alert(content.alerts.expiredTitle, content.alerts.expiredMsg);
        } else {
          Alert.alert(content.alerts.errorTitle, content.alerts.acceptFail);
        }
      } finally {
        setAdvancing(null);
      }
    },
    [changeOrderStatus, markExpired]
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
    } catch {
      Alert.alert(content.alerts.errorTitle, content.alerts.rejectFail);
    } finally {
      setRejecting(false);
    }
  }, [rejectModal, rejectReason, rejectOrder]);

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
    handleAssignMissingPartner,
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
