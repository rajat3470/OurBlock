import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Order, OrderStatus } from "@/types";
import {
  effectiveOrderStatus,
  ORDER_AUTO_REJECT_REASON,
} from "@utils/orderAcceptance";
import content from "@/content/orders.json";

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
  confirmed: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  preparing: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  ready: { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
  outForDelivery: { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8" },
  delivered: { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" },
  cancelled: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  rejected: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
};

const STATUS_LABEL: Record<string, string> = content.statusLabels;

function getStatusStyle(status: string) {
  return STATUS_COLOR[status] ?? STATUS_COLOR.pending;
}

function getPaymentText(paymentStatus?: string) {
  if (paymentStatus === "cod") return content.payment.cod;
  if (paymentStatus === "completed") return content.payment.completed;
  if (paymentStatus === "failed") return content.payment.failed;
  return content.payment.pending;
}

interface UserOrderCardProps {
  order: Order;
  now: number;
  onPress: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onReorder: (order: Order) => void;
  onRate: (order: Order) => void;
  onRefund: (order: Order) => void;
}

export default function UserOrderCard({
  order,
  now,
  onPress,
  onCancel,
  onReorder,
  onRate,
  onRefund,
}: UserOrderCardProps) {
  const displayStatus = effectiveOrderStatus(order, now);
  const statusStyle = getStatusStyle(displayStatus);
  const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];
  const canCancel =
    displayStatus === OrderStatus.PENDING || displayStatus === OrderStatus.CONFIRMED;
  const rejectionReason =
    displayStatus === OrderStatus.REJECTED
      ? (order as any).rejectionReason ?? ORDER_AUTO_REJECT_REASON
      : null;

  const isClosed =
    displayStatus === OrderStatus.DELIVERED ||
    displayStatus === OrderStatus.CANCELLED ||
    displayStatus === OrderStatus.REJECTED;
  const showReorder = isClosed;
  const showRate = displayStatus === OrderStatus.DELIVERED;
  const showRefund =
    displayStatus === OrderStatus.DELIVERED && !(order as any).refundRequested;
  const showActions = canCancel || showReorder || showRate || showRefund;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(order.id)}
      activeOpacity={0.97}
    >
      {/* Top row */}
      <View style={styles.rowTop}>
        <View>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.businessName}>{(order as any).businessName ?? content.card.defaultShop}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.amount}>{content.card.currency} {order.finalAmount}</Text>
          <Text style={styles.orderMeta}>
            {orderItems.length} {orderItems.length !== 1 ? content.card.itemPlural : content.card.itemSingular}
          </Text>
        </View>
      </View>

      {/* Items list */}
      {orderItems.slice(0, 3).map((orderItem: any, idx: number) => (
        <View key={idx} style={styles.itemRow}>
          <Text style={styles.itemQty}>{orderItem.quantity}×</Text>
          <Text style={styles.itemName} numberOfLines={1}>
            {orderItem.productName ?? `Item ${idx + 1}`}
          </Text>
          <Text style={styles.itemPrice}>{content.card.currency} {orderItem.lineTotal ?? orderItem.price * orderItem.quantity}</Text>
        </View>
      ))}
      {orderItems.length > 3 ? (
        <Text style={styles.moreItems}>+{orderItems.length - 3} {content.card.moreItems}</Text>
      ) : null}

      {/* Price breakdown */}
      <View style={styles.priceBreakdown}>
        <Text style={styles.priceBreakdownText}>
          {content.card.subtotalLabel} {content.card.currency} {(order as any).subTotal ?? order.totalAmount} · {content.card.platformFeeLabel} {content.card.currency} {(order as any).platformFee ?? 2}
        </Text>
      </View>

      {/* Bottom row */}
      <View style={styles.rowBottom}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
          ]}
        >
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {STATUS_LABEL[displayStatus] ?? displayStatus}
          </Text>
        </View>
        <Text style={styles.paymentText}>{getPaymentText(order.paymentStatus)}</Text>
      </View>

      {/* Action buttons */}
      {showActions ? (
        <View style={styles.actionRow}>
          {canCancel ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(order.id)}>
              <Text style={styles.cancelBtnText}>{content.card.cancel}</Text>
            </TouchableOpacity>
          ) : null}
          {showReorder ? (
            <TouchableOpacity style={styles.reorderBtn} onPress={() => onReorder(order)}>
              <Ionicons name="refresh" size={12} color="#0E9F6E" />
              <Text style={styles.reorderBtnText}>{content.card.reorder}</Text>
            </TouchableOpacity>
          ) : null}
          {showRate ? (
            <TouchableOpacity style={styles.rateBtn} onPress={() => onRate(order)}>
              <Ionicons name="star-outline" size={12} color="#D97706" />
              <Text style={styles.rateBtnText}>{content.card.rate}</Text>
            </TouchableOpacity>
          ) : null}
          {showRefund ? (
            <TouchableOpacity style={styles.refundBtn} onPress={() => onRefund(order)}>
              <Ionicons name="return-up-back-outline" size={12} color="#7C3AED" />
              <Text style={styles.refundBtnText}>{content.card.refund}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {rejectionReason ? (
        <View style={styles.rejectionBanner}>
          <Text style={styles.rejectionLabel}>{content.card.rejectionLabel}</Text>
          <Text style={styles.rejectionText}>{rejectionReason}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  orderId: { fontSize: 14, fontWeight: "800", color: "#111827" },
  businessName: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  rightCol: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "800", color: "#0E9F6E" },
  orderMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 6,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 28,
    textAlign: "center",
  },
  itemName: { flex: 1, fontSize: 13, color: "#374151" },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#111827" },
  moreItems: { fontSize: 11, color: "#9CA3AF", marginTop: 4, marginLeft: 34 },
  priceBreakdown: {
    marginTop: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceBreakdownText: { fontSize: 11, color: "#9CA3AF" },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  paymentText: { color: "#64748B", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cancelBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: { fontSize: 11, fontWeight: "700", color: "#991B1B" },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  reorderBtnText: { fontSize: 11, fontWeight: "700", color: "#0E9F6E" },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  rateBtnText: { fontSize: 11, fontWeight: "700", color: "#D97706" },
  refundBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  refundBtnText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  rejectionBanner: {
    marginTop: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectionLabel: { fontSize: 11, fontWeight: "700", color: "#991B1B", marginBottom: 2 },
  rejectionText: { fontSize: 12, color: "#7F1D1D", lineHeight: 17 },
});
