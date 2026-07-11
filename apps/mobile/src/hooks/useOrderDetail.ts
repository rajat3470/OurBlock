import { useCallback, useEffect, useState } from "react";
import { Share } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useUserApp } from "@hooks/useUserApp";
import { userAppService } from "@services/userAppService";
import { Order, OrderStatus } from "@/types";
import {
  effectiveOrderStatus,
  getAcceptanceDeadlineMs,
  ORDER_AUTO_REJECT_REASON,
  toMillis,
} from "@utils/orderAcceptance";
import content from "@/content/orderDetail.json";

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  pending: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", emoji: "⏳" },
  confirmed: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", emoji: "✅" },
  preparing: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", emoji: "⚙️" },
  ready: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D", emoji: "📦" },
  outForDelivery: { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8", emoji: "🚚" },
  delivered: { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46", emoji: "🎉" },
  cancelled: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", emoji: "✗" },
  rejected: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", emoji: "🚫" },
};

function normalizeOrderPayload(payload: any): Order | null {
  const raw = payload?.order ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id && raw._id) {
    return { ...raw, id: raw._id } as Order;
  }
  return raw as Order;
}

function formatDateTime(date: unknown): string {
  const ms = toMillis(date);
  if (ms == null) return "";
  const d = new Date(ms);
  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

function buildInvoiceText(order: Order): string {
  const id = `#${(order.id ?? "").slice(0, 8).toUpperCase()}`;
  const createdMs = toMillis(order.createdAt as unknown);
  const date = (createdMs != null ? new Date(createdMs) : new Date()).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const bizName = (order as any).businessName ?? content.invoice.shop;
  const itemLines = (Array.isArray((order as any).items) ? (order as any).items : [])
    .map((i: any) => `  • ${i.quantity}x ${i.productName ?? "Item"} — ${content.currency}${i.lineTotal ?? i.price * i.quantity}`)
    .join("\n");
  const addr = order.deliveryAddress as any;
  const addrParts = [addr?.street, addr?.landmark, addr?.city, addr?.state, addr?.pinCode].filter(Boolean);
  const payLabel =
    order.paymentStatus === "cod"
      ? content.paymentStatus.cod
      : order.paymentStatus === "completed"
      ? content.paymentStatus.completed
      : content.paymentStatus.pending;

  return [
    content.invoice.title,
    content.invoice.divider.repeat(32),
    `${content.invoice.order} ${id}`,
    `${content.invoice.date} ${date}`,
    `${content.invoice.shop} ${bizName}`,
    "",
    content.invoice.items,
    itemLines,
    "",
    content.invoice.divider.repeat(32),
    `${content.invoice.subtotal} ${content.currency}${order.subTotal}`,
    `${content.invoice.platformFee} ${content.currency}${order.platformFee}`,
    order.discountAmount ? `${content.invoice.discount} ${content.currency}${order.discountAmount}` : null,
    order.taxAmount ? `${content.invoice.tax} ${content.currency}${order.taxAmount}` : null,
    `${content.invoice.total} ${content.currency}${order.finalAmount}`,
    content.invoice.divider.repeat(32),
    "",
    `${content.invoice.payment} ${order.paymentMethod.toUpperCase()} · ${payLabel}`,
    `${content.invoice.status} ${content.statusLabels[order.status] ?? order.status}`,
    "",
    content.invoice.deliveryAddress,
    `  ${addrParts.join(", ")}`,
    "",
    content.invoice.footer,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/**
 * Encapsulates all logic for the customer order detail screen: order lookup,
 * Firestore real-time order sync, status tickers, invoice sharing, and computed
 * display state.
 */
export const useOrderDetail = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders } = useUserApp();
  const [order, setOrder] = useState<Order | null>(
    () => orders.find((o) => o.id === orderId) ?? null
  );
  const [fetching, setFetching] = useState(!order);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      setFetching(true);
      userAppService
        .getOrder(orderId)
        .then((data) => {
          const normalized = normalizeOrderPayload(data);
          if (normalized?.id) setOrder(normalized);
        })
        .catch(() => null)
        .finally(() => setFetching(false));
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const latest = orders.find((o) => o.id === orderId);
    if (latest) setOrder(latest);
  }, [orders, orderId]);

  const refetchOrder = useCallback(() => {
    if (!orderId) return;
    userAppService
      .getOrder(orderId)
      .then((data) => {
        const normalized = normalizeOrderPayload(data);
        if (normalized?.id) setOrder(normalized);
      })
      .catch(() => null);
  }, [orderId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (order?.status !== OrderStatus.PENDING) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);

  const handleShare = useCallback(async () => {
    if (!order) return;
    setSharing(true);
    try {
      await Share.share({
        message: buildInvoiceText(order),
        title: `${content.invoice.order} #${(order.id ?? "").slice(0, 8).toUpperCase()} Invoice`,
      });
    } catch {
      /* user cancelled share */
    } finally {
      setSharing(false);
    }
  }, [order]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/orders");
    }
  }, []);

  const displayStatus = order ? effectiveOrderStatus(order, now) : null;
  const statusMeta = displayStatus ? STATUS_COLOR[displayStatus] ?? STATUS_COLOR.pending : null;
  const orderItems = order ? (Array.isArray((order as any).items) ? (order as any).items : []) : [];
  const paymentMethod = order?.paymentMethod ?? "cash";
  const awaitingDeadlineMs =
    order && displayStatus === OrderStatus.PENDING ? getAcceptanceDeadlineMs(order) : null;
  const rejectionReason =
    order && displayStatus === OrderStatus.REJECTED
      ? (order as any).rejectionReason ?? ORDER_AUTO_REJECT_REASON
      : null;
  const addr = order?.deliveryAddress as any;
  const addressLine = addr ? [addr.street, addr.landmark].filter(Boolean).join(", ") : "";
  const addressCity = addr ? [addr.city, addr.state, addr.pinCode].filter(Boolean).join(", ") : "";

  return {
    orderId,
    order,
    fetching,
    sharing,
    displayStatus,
    statusMeta,
    orderItems,
    paymentMethod,
    awaitingDeadlineMs,
    rejectionReason,
    addressLine,
    addressCity,
    addr,
    now,
    formatDateTime,
    handleShare,
    goBack,
    refetchOrder,
  };
};
