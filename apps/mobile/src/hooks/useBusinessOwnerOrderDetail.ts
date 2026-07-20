import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Share } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBusinessOwner } from "@hooks/useBusinessOwner";
import { businessOwnerService } from "@services/businessOwnerService";
import { Order, OrderStatus } from "@/types";
import {
  getAcceptanceDeadlineMs,
  effectiveOrderStatus,
  toMillis,
} from "@utils/orderAcceptance";
import content from "@/content/boOrderDetail.json";

type PartnerOption = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
};

type StatusStyle = { color: string; bg: string; border: string; emoji: string; labelKey: keyof typeof content.statusLabels };

const STATUS_STYLE: Record<string, StatusStyle> = {
  [OrderStatus.PENDING]: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", emoji: "🔔", labelKey: "pending" },
  [OrderStatus.CONFIRMED]: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", emoji: "✅", labelKey: "confirmed" },
  [OrderStatus.PREPARING]: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", emoji: "⚙️", labelKey: "preparing" },
  [OrderStatus.READY]: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", emoji: "📦", labelKey: "ready" },
  [OrderStatus.OUT_FOR_DELIVERY]: { color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD", emoji: "🚚", labelKey: "outForDelivery" },
  [OrderStatus.DELIVERED]: { color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", emoji: "🎉", labelKey: "delivered" },
  [OrderStatus.CANCELLED]: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", emoji: "✗", labelKey: "cancelled" },
  [OrderStatus.REJECTED]: { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", emoji: "🚫", labelKey: "rejected" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
};

const NEXT_LABEL_KEY: Partial<Record<OrderStatus, keyof typeof content.nextStatusLabels>> = {
  [OrderStatus.PENDING]: "pending",
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
    border: style.border,
    emoji: style.emoji,
  };
}

export function getNextStatus(status: OrderStatus) {
  return NEXT_STATUS[status];
}

export function getNextStatusLabel(status: OrderStatus) {
  const key = NEXT_LABEL_KEY[status];
  return key ? content.nextStatusLabels[key] : undefined;
}

export function formatDateTime(date: unknown): string {
  const ms = toMillis(date);
  if (ms == null) return "";
  const d = new Date(ms);
  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

export function buildInvoiceText(order: Order, brandName = "mohallaMitr"): string {
  const id = `#${order.id.slice(0, 8).toUpperCase()}`;
  const createdMs = toMillis(order.createdAt as unknown);
  const date = (createdMs != null ? new Date(createdMs) : new Date()).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const meta = getOrderStatusMeta(order.status);
  const itemLines = (order.items as any[])
    .map((i) => `${content.invoice.itemLinePrefix}${i.quantity}x ${i.productName ?? content.invoice.itemFallback} — ${content.currency}${i.lineTotal ?? i.price * i.quantity}`)
    .join("\n");
  const addr = order.deliveryAddress as any;
  const addrParts = [addr?.street, addr?.landmark, addr?.city, addr?.state, addr?.pinCode].filter(Boolean);
  const payLabel =
    order.paymentStatus === "cod" ? content.payment.cod :
    order.paymentStatus === "completed" ? content.payment.paid : content.payment.pending;
  const customer = (order as any).userName ?? "Customer";
  const phone = (order as any).userPhone ?? "";
  const sep = content.invoice.separator.repeat(content.invoice.separatorLength);

  return [
    `${content.invoice.titlePrefix}${brandName}`,
    sep,
    `${content.invoice.orderLabel}${id}`,
    `${content.invoice.dateLabel}${date}`,
    `${content.invoice.customerLabel}${customer}${phone ? " · " + phone : ""}`,
    `${content.invoice.statusLabel}${meta?.label ?? order.status}`,
    "",
    content.invoice.itemsHeader,
    itemLines,
    "",
    sep,
    `${content.invoice.subtotalLabel}${content.currency}${order.subTotal}`,
    `${content.invoice.platformFeeLabel}${content.currency}${order.platformFee}`,
    order.discountAmount ? `${content.invoice.discountLabel}${content.currency}${order.discountAmount}` : null,
    order.taxAmount ? `${content.invoice.taxLabel}${content.currency}${order.taxAmount}` : null,
    `${content.invoice.totalLabel}${content.currency}${order.finalAmount}`,
    sep,
    "",
    `${content.invoice.paymentLabel}${order.paymentMethod.toUpperCase()} · ${payLabel}`,
    "",
    content.invoice.addressHeader,
    `${content.invoice.addressIndent}${addrParts.join(", ")}`,
    "",
    order.notes ? `${content.invoice.notesLabel}${order.notes}` : null,
    "",
    content.invoice.footer,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/**
 * Encapsulates all logic for the business owner order detail screen: order
 * lookup, status transitions, acceptance expiration, invoice sharing, and
 * navigation.
 */
export const useBusinessOwnerOrderDetail = () => {
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, changeOrderStatus } = useBusinessOwner();
  const [advancing, setAdvancing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [detailExpired, setDetailExpired] = useState(false);

  const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);

  /** Partner must be chosen on the Ready → Out for Delivery step. */
  const needsPartnerForDispatch = order?.status === OrderStatus.READY;

  useEffect(() => {
    if (!needsPartnerForDispatch) return;
    let cancelled = false;
    (async () => {
      try {
        setPartnersLoading(true);
        const list = await businessOwnerService.getDeliveryPartners();
        if (!cancelled) {
          const active = list.filter((p) => p.status === "active");
          setPartners(active);
          const existing = order?.assignedDeliveryPartnerId;
          if (existing && active.some((p) => p.id === existing)) {
            setSelectedPartnerId(existing);
          } else if (active.length === 1) {
            setSelectedPartnerId(active[0].id);
          }
        }
      } catch {
        if (!cancelled) setPartners([]);
      } finally {
        if (!cancelled) setPartnersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsPartnerForDispatch, order?.assignedDeliveryPartnerId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (order?.status !== OrderStatus.PENDING) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status]);

  const handleAdvance = useCallback(async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    let deliveryPartnerId: string | undefined;
    if (next === OrderStatus.OUT_FOR_DELIVERY) {
      deliveryPartnerId = selectedPartnerId ?? order.assignedDeliveryPartnerId ?? undefined;
      if (!deliveryPartnerId) {
        Alert.alert(content.alerts.partnerRequiredTitle, content.alerts.partnerRequiredMsg);
        return;
      }
    }

    setAdvancing(true);
    try {
      await changeOrderStatus(
        order.id,
        next,
        deliveryPartnerId ? { deliveryPartnerId } : undefined
      );
    } catch (err) {
      const code = (err as any)?.response?.data?.code;
      const httpStatus = (err as any)?.response?.status;
      if (code === "ACCEPTANCE_WINDOW_EXPIRED" || code === "ORDER_NOT_PENDING" || httpStatus === 409) {
        setDetailExpired(true);
        Alert.alert(content.alerts.expiredTitle, content.alerts.expiredMsg);
      } else if (code === "DELIVERY_PARTNER_REQUIRED") {
        Alert.alert(content.alerts.partnerRequiredTitle, content.alerts.partnerRequiredMsg);
      } else {
        Alert.alert(
          content.alerts.errorTitle,
          (err as any)?.response?.data?.error ?? content.alerts.advanceFail
        );
      }
    } finally {
      setAdvancing(false);
    }
  }, [changeOrderStatus, order, selectedPartnerId]);

  const handleAssignPartner = useCallback((partnerId: string | null) => {
    setSelectedPartnerId(partnerId);
  }, []);

  const goReject = useCallback(() => {
    if (!order) return;
    router.push(`/(business-owner)/orders?rejectOrderId=${order.id}`);
  }, [order]);

  const handleShare = useCallback(async () => {
    if (!order) return;
    setSharing(true);
    try {
      await Share.share({
        message: buildInvoiceText(order),
        title: `${content.invoice.shareTitlePrefix}${order.id.slice(0, 8).toUpperCase()}${content.invoice.titleSuffix}`,
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
      router.replace("/(business-owner)/orders");
    }
  }, []);

  const derived = useMemo(() => {
    if (!order) {
      return null;
    }
    const displayStatus = effectiveOrderStatus(order, now);
    const meta = getOrderStatusMeta(displayStatus);
    const addr = order.deliveryAddress as any;
    const addressLine = [addr?.street, addr?.landmark].filter(Boolean).join(", ");
    const addressCity = [addr?.city, addr?.state, addr?.pinCode].filter(Boolean).join(", ");
    const canAdvance = !!NEXT_STATUS[displayStatus];
    const isPending = order.status === OrderStatus.PENDING;
    const deadlineMs = isPending ? getAcceptanceDeadlineMs(order) : null;
    const windowExpired = isPending && ((deadlineMs != null && now >= deadlineMs) || detailExpired);
    const nextLabel = getNextStatusLabel(order.status);

    return {
      displayStatus,
      meta,
      addressLine,
      addressCity,
      canAdvance,
      isPending,
      deadlineMs,
      windowExpired,
      nextLabel,
    };
  }, [order, now, detailExpired]);

  return {
    insets,
    order,
    orderId,
    advancing,
    sharing,
    partners,
    partnersLoading,
    selectedPartnerId,
    needsPartnerForDispatch,
    canAssignPartner: needsPartnerForDispatch,
    detailExpired,
    setDetailExpired,
    now,
    derived,
    handleAdvance,
    handleAssignPartner,
    goReject,
    handleShare,
    goBack,
    formatDateTime,
    getOrderStatusMeta,
    effectiveOrderStatus,
    getAcceptanceDeadlineMs,
  };
};
