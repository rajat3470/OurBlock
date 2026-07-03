import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { Order, OrderStatus } from "../../src/types";
import SafeAreaScreen from "../../src/components/SafeAreaScreen";
import SafeAreaHeader from "../../src/components/SafeAreaHeader";

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  [OrderStatus.PENDING]:          { label: "New Order",        color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", emoji: "🔔" },
  [OrderStatus.CONFIRMED]:        { label: "Accepted",         color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", emoji: "✅" },
  [OrderStatus.PREPARING]:        { label: "Processing",       color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", emoji: "⚙️" },
  [OrderStatus.READY]:            { label: "Ready to Collect", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", emoji: "📦" },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: "On the Way",       color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD", emoji: "🚚" },
  [OrderStatus.DELIVERED]:        { label: "Completed",        color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", emoji: "🎉" },
  [OrderStatus.CANCELLED]:        { label: "Cancelled",        color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", emoji: "✗"  },
  [OrderStatus.REJECTED]:         { label: "Rejected",         color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", emoji: "🚫" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]:          OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]:        OrderStatus.PREPARING,
  [OrderStatus.PREPARING]:        OrderStatus.READY,
  [OrderStatus.READY]:            OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING]:          "✅ Accept Order",
  [OrderStatus.CONFIRMED]:        "⚙️ Start Processing",
  [OrderStatus.PREPARING]:        "📦 Mark Ready",
  [OrderStatus.READY]:            "🚚 Out for Delivery",
  [OrderStatus.OUT_FOR_DELIVERY]: "✅ Mark Delivered",
};

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

function buildInvoiceText(order: Order): string {
  const id = `#${order.id.slice(0, 8).toUpperCase()}`;
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const meta = STATUS_META[order.status];
  const itemLines = (order.items as any[])
    .map((i) => `  • ${i.quantity}x ${i.productName ?? "Item"} — Rs ${i.lineTotal ?? i.price * i.quantity}`)
    .join("\n");
  const addr = order.deliveryAddress as any;
  const addrParts = [addr?.street, addr?.landmark, addr?.city, addr?.state, addr?.pinCode].filter(Boolean);
  const payLabel =
    order.paymentStatus === "cod" ? "Cash on Delivery" :
    order.paymentStatus === "completed" ? "Paid" : "Pending";
  const customer = (order as any).userName ?? "Customer";
  const phone = (order as any).userPhone ?? "";

  return [
    "🧾 ORDER INVOICE — OurBlock",
    "─".repeat(32),
    `Order:    ${id}`,
    `Date:     ${date}`,
    `Customer: ${customer}${phone ? " · " + phone : ""}`,
    `Status:   ${meta?.label ?? order.status}`,
    "",
    "ITEMS:",
    itemLines,
    "",
    "─".repeat(32),
    `Subtotal:     Rs ${order.subTotal}`,
    `Platform Fee: Rs ${order.platformFee}`,
    order.discountAmount ? `Discount:    -Rs ${order.discountAmount}` : null,
    order.taxAmount ? `Tax:          Rs ${order.taxAmount}` : null,
    `TOTAL:        Rs ${order.finalAmount}`,
    "─".repeat(32),
    "",
    `Payment:  ${order.paymentMethod.toUpperCase()} · ${payLabel}`,
    "",
    "Delivery Address:",
    `  ${addrParts.join(", ")}`,
    "",
    order.notes ? `Notes: ${order.notes}` : null,
    "",
    "Powered by OurBlock 🏘️",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export default function BusinessOwnerOrderDetail() {
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, changeOrderStatus } = useBusinessOwner();
  const [advancing, setAdvancing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const order = orders.find((o) => o.id === orderId);

  const handleAdvance = async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(true);
    try {
      await changeOrderStatus(order.id, next);
    } catch {
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleShare = async () => {
    if (!order) return;
    setSharing(true);
    try {
      await Share.share({
        message: buildInvoiceText(order),
        title: `Order #${order.id.slice(0, 8).toUpperCase()} Invoice`,
      });
    } catch {
      /* user cancelled share */
    } finally {
      setSharing(false);
    }
  };

  if (!order) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#F8FAFC" }]}>
        <Text style={styles.notFoundText}>Order not found.</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(business-owner)/orders")}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = STATUS_META[order.status];
  const addr = order.deliveryAddress as any;
  const addressLine = [addr?.street, addr?.landmark].filter(Boolean).join(", ");
  const addressCity = [addr?.city, addr?.state, addr?.pinCode].filter(Boolean).join(", ");
  const canAdvance = !!NEXT_STATUS[order.status];

  return (
    <SafeAreaScreen backgroundColor="#F8FAFC">
      <SafeAreaHeader
        title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
        subtitle={formatDateTime(order.createdAt)}
        colors={["#16A34A", "#15803D"] as const}
        showBackButton
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(business-owner)/orders");
          }
        }}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Banner ───────────────────────────────────────── */}
        <View style={[styles.statusCard, { backgroundColor: meta?.bg, borderColor: meta?.border }]}>
          <Text style={styles.statusEmoji}>{meta?.emoji}</Text>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: meta?.color }]}>{meta?.label ?? order.status}</Text>
            <Text style={[styles.statusPayment, { color: meta?.color }]}>
              {order.paymentMethod.toUpperCase()} ·{" "}
              {order.paymentStatus === "cod" ? "Cash on Delivery" :
               order.paymentStatus === "completed" ? "Paid" : "Pending"}
            </Text>
          </View>
        </View>

        {/* ── Customer Info ────────────────────────────────────────── */}
        {((order as any).userName || (order as any).userPhone) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            {(order as any).userName ? (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={15} color="#64748B" />
                <Text style={styles.infoText}>{(order as any).userName}</Text>
              </View>
            ) : null}
            {(order as any).userPhone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={15} color="#64748B" />
                <Text style={styles.infoText}>{(order as any).userPhone}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Items ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {(order.items as any[]).map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}×</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName ?? `Item ${idx + 1}`}
              </Text>
              <Text style={styles.itemTotal}>
                ₹{item.lineTotal ?? item.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{order.subTotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Fee</Text>
            <Text style={styles.priceValue}>₹{order.platformFee}</Text>
          </View>
          {order.discountAmount ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount</Text>
              <Text style={[styles.priceValue, { color: "#16A34A" }]}>−₹{order.discountAmount}</Text>
            </View>
          ) : null}
          {order.taxAmount ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>₹{order.taxAmount}</Text>
            </View>
          ) : null}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.finalAmount}</Text>
          </View>
        </View>

        {/* ── Delivery Address ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color="#64748B" />
            <View style={{ flex: 1 }}>
              {addressLine ? <Text style={styles.infoText}>{addressLine}</Text> : null}
              {addressCity ? <Text style={[styles.infoText, { color: "#94A3B8" }]}>{addressCity}</Text> : null}
            </View>
          </View>
        </View>

        {/* ── Notes ───────────────────────────────────────────────── */}
        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <View style={styles.infoRow}>
              <Ionicons name="chatbubble-outline" size={15} color="#64748B" />
              <Text style={[styles.infoText, { fontStyle: "italic" }]}>{order.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Tracking Timeline ───────────────────────────────────── */}
        {order.trackingUpdates && order.trackingUpdates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            {[...order.trackingUpdates].reverse().map((update, idx) => (
              <View key={idx} style={styles.trackRow}>
                <View style={styles.trackDotCol}>
                  <View style={[styles.trackDot, idx === 0 && styles.trackDotActive]} />
                  {idx < order.trackingUpdates!.length - 1 ? <View style={styles.trackLine} /> : null}
                </View>
                <View style={styles.trackContent}>
                  <Text style={[styles.trackStatus, idx === 0 && { color: "#16A34A" }]}>
                    {STATUS_META[update.status]?.label ?? update.status}
                  </Text>
                  <Text style={styles.trackTime}>
                    {new Date(update.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(update.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {update.rejectionReason ? (
                    <Text style={styles.trackNote}>Reason: {update.rejectionReason}</Text>
                  ) : update.notes ? (
                    <Text style={styles.trackNote}>{update.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Rejection ────────────────────────────────────────────── */}
        {order.status === OrderStatus.REJECTED && (order as any).rejectionReason ? (
          <View style={[styles.section, styles.rejectionSection]}>
            <Text style={styles.rejectionTitle}>🚫 Rejection Reason</Text>
            <Text style={styles.rejectionText}>{(order as any).rejectionReason}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {canAdvance ? (
          <TouchableOpacity
            style={[styles.advanceBtn, advancing && { opacity: 0.7 }]}
            onPress={handleAdvance}
            disabled={advancing}
            activeOpacity={0.85}
          >
            {advancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.advanceBtnText}>{NEXT_LABEL[order.status]}</Text>
            )}
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.shareBtn, canAdvance && { backgroundColor: "#F1F5F9" }]}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={canAdvance ? "#16A34A" : "#FFFFFF"} />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color={canAdvance ? "#16A34A" : "#FFFFFF"} />
              <Text style={[styles.shareBtnText, canAdvance && { color: "#16A34A" }]}>Share Invoice</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFoundText: { fontSize: 15, color: "#64748B", marginBottom: 12 },
  goBackBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: "#16A34A", borderRadius: 999,
  },
  goBackText: { color: "#FFFFFF", fontWeight: "700" },

  body: { flex: 1 },

  // Status
  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: 16, padding: 16, borderRadius: 16, borderWidth: 1,
  },
  statusEmoji: { fontSize: 28 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 15, fontWeight: "700" },
  statusPayment: { fontSize: 12, fontWeight: "500", marginTop: 2, opacity: 0.8 },

  // Sections
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 13, color: "#1E293B", fontWeight: "500", lineHeight: 20 },

  // Items
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  qtyBadge: {
    backgroundColor: "#DCFCE7", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, minWidth: 30, alignItems: "center",
  },
  qtyText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  itemName: { flex: 1, fontSize: 13, color: "#1E293B", fontWeight: "500" },
  itemTotal: { fontSize: 13, fontWeight: "700", color: "#1E293B" },

  // Pricing
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  priceLabel: { fontSize: 13, color: "#64748B" },
  priceValue: { fontSize: 13, color: "#1E293B", fontWeight: "500" },
  totalRow: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  totalValue: { fontSize: 15, fontWeight: "800", color: "#16A34A" },

  // Tracking
  trackRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  trackDotCol: { alignItems: "center", width: 14 },
  trackDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#CBD5E1", marginTop: 3,
  },
  trackDotActive: { backgroundColor: "#16A34A", width: 12, height: 12, borderRadius: 6 },
  trackLine: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginTop: 4, minHeight: 20 },
  trackContent: { flex: 1, paddingBottom: 16 },
  trackStatus: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  trackTime: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  trackNote: { fontSize: 12, color: "#64748B", marginTop: 3, fontStyle: "italic" },

  // Rejection
  rejectionSection: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  rejectionTitle: { fontSize: 13, fontWeight: "700", color: "#DC2626", marginBottom: 6 },
  rejectionText: { fontSize: 13, color: "#7F1D1D", lineHeight: 18 },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FFFFFF", paddingTop: 12, paddingHorizontal: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: -3 }, shadowRadius: 8, elevation: 8,
  },
  advanceBtn: {
    backgroundColor: "#16A34A", borderRadius: 999,
    paddingVertical: 14, alignItems: "center",
  },
  advanceBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#16A34A", borderRadius: 999, paddingVertical: 13,
  },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
