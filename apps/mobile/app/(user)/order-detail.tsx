import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserApp } from "../../src/hooks/useUserApp";
import { userAppService } from "../../src/services/userAppService";
import { Order, OrderStatus } from "../../src/types";
import { useSocketEvent } from "../../src/hooks/useSocket";
import { socketService } from "../../src/services/socketService";
import SafeAreaScreen from "../../src/components/SafeAreaScreen";
import SafeAreaHeader from "../../src/components/SafeAreaHeader";

const STATUS_LABEL: Record<string, string> = {
  pending:        "Waiting for Acceptance",
  confirmed:      "Accepted",
  preparing:      "Processing",
  ready:          "Ready to Collect",
  outForDelivery: "On the Way",
  delivered:      "Completed",
  cancelled:      "Cancelled",
  rejected:       "Rejected",
};

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  pending:         { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412",  emoji: "⏳" },
  confirmed:       { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46",  emoji: "✅" },
  preparing:       { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF",  emoji: "⚙️" },
  ready:           { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D",  emoji: "📦" },
  outForDelivery:  { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8",  emoji: "🚚" },
  delivered:       { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46",  emoji: "🎉" },
  cancelled:       { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B",  emoji: "✗"  },
  rejected:        { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B",  emoji: "🚫" },
};

function normalizeOrderPayload(payload: any): Order | null {
  const raw = payload?.order ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id && raw._id) {
    return { ...raw, id: raw._id } as Order;
  }
  return raw as Order;
}

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
  const bizName = (order as any).businessName ?? "Shop";
  const itemLines = (Array.isArray((order as any).items) ? (order as any).items : [])
    .map((i: any) => `  • ${i.quantity}x ${i.productName ?? "Item"} — Rs ${i.lineTotal ?? i.price * i.quantity}`)
    .join("\n");
  const addr = order.deliveryAddress as any;
  const addrParts = [addr?.street, addr?.landmark, addr?.city, addr?.state, addr?.pinCode].filter(Boolean);
  const payLabel =
    order.paymentStatus === "cod" ? "Cash on Delivery" :
    order.paymentStatus === "completed" ? "Paid" : "Pending";

  return [
    "🧾 ORDER INVOICE — OurBlock",
    "─".repeat(32),
    `Order: ${id}`,
    `Date:  ${date}`,
    `Shop:  ${bizName}`,
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
    `Status:   ${STATUS_LABEL[order.status] ?? order.status}`,
    "",
    "Delivery Address:",
    `  ${addrParts.join(", ")}`,
    "",
    "Powered by OurBlock 🏘️",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export default function UserOrderDetail() {
  const insets = useSafeAreaInsets();
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
        .then(setOrder)
        .catch(() => null)
        .finally(() => setFetching(false));
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) return;

      const syncOrder = () => {
        if (socketService.isConnected()) return;
        userAppService
          .getOrder(orderId)
          .then(setOrder)
          .catch(() => null);
      };

      syncOrder();
      const timer = setInterval(syncOrder, 3000);
      return () => clearInterval(timer);
    }, [orderId])
  );

  // Keep local state aligned when Redux orders are refreshed by another flow
  // (e.g. pull-to-refresh, app resume, or background sync).
  useEffect(() => {
    if (!orderId) return;
    const latest = orders.find((o) => o.id === orderId);
    if (latest) {
      setOrder(latest);
    }
  }, [orders, orderId]);

  // Real-time: update this specific order instantly when the business owner
  // changes its status. Filtered by ID so other orders don't cause re-renders.
  useSocketEvent<any>("order:updated", (payload) => {
    const updatedOrder = normalizeOrderPayload(payload);
    if (!updatedOrder?.id) return;
    if (updatedOrder.id === orderId) {
      setOrder(updatedOrder);
    }
  });

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

  if (fetching) {
    return (
      <SafeAreaScreen backgroundColor="#0E9F6E">
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaScreen>
    );
  }

  if (!order) {
    return (
      <SafeAreaScreen backgroundColor="#F8FAFC">
        <View style={styles.fullCenter}>
          <Text style={styles.notFoundText}>Order not found.</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(user)/(tabs)/orders")}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const statusMeta = STATUS_COLOR[order.status] ?? STATUS_COLOR.pending;
  const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];
  const paymentMethod = order.paymentMethod ?? "cash";
  const addr = order.deliveryAddress as any;
  const addressLine = [addr?.street, addr?.landmark].filter(Boolean).join(", ");
  const addressCity = [addr?.city, addr?.state, addr?.pinCode].filter(Boolean).join(", ");

  return (
    <SafeAreaScreen backgroundColor="#F8FAFC">
      <SafeAreaHeader
        title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
        subtitle={formatDateTime(order.createdAt)}
        colors={["#0E9F6E", "#0891B2"] as const}
        showBackButton
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(user)/(tabs)/orders");
          }
        }}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Banner ───────────────────────────────────────── */}
        <View style={[styles.statusCard, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
          <Text style={styles.statusEmoji}>{statusMeta.emoji}</Text>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusMeta.text }]}>
              {STATUS_LABEL[order.status] ?? order.status}
            </Text>
            <Text style={[styles.statusPayment, { color: statusMeta.text }]}>
              {paymentMethod.toUpperCase()} ·{" "}
              {order.paymentStatus === "cod"
                ? "Cash on Delivery"
                : order.paymentStatus === "completed"
                ? "Paid"
                : "Pending"}
            </Text>
          </View>
        </View>

        {/* ── Shop ─────────────────────────────────────────────────── */}
        {(order as any).businessName ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop</Text>
            <Text style={styles.sectionValue}>{(order as any).businessName}</Text>
          </View>
        ) : null}

        {/* ── Items ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({orderItems.length})</Text>
          {orderItems.map((item: any, idx: number) => (
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
          {addressLine ? <Text style={styles.sectionValue}>{addressLine}</Text> : null}
          {addressCity ? <Text style={styles.sectionSubValue}>{addressCity}</Text> : null}
          {addr?.type ? (
            <View style={styles.addressTypePill}>
              <Text style={styles.addressTypeText}>
                {addr.type.charAt(0).toUpperCase() + addr.type.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Notes ───────────────────────────────────────────────── */}
        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <Text style={styles.sectionValue}>{order.notes}</Text>
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
                  <Text style={[styles.trackStatus, idx === 0 && { color: "#0E9F6E" }]}>
                    {STATUS_LABEL[update.status] ?? update.status}
                  </Text>
                  <Text style={styles.trackTime}>
                    {new Date(update.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(update.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {update.notes ? <Text style={styles.trackNote}>{update.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Rejection Reason ─────────────────────────────────────── */}
        {order.status === OrderStatus.REJECTED && (order as any).rejectionReason ? (
          <View style={[styles.section, styles.rejectionSection]}>
            <Text style={styles.rejectionTitle}>🚫 Rejection Reason</Text>
            <Text style={styles.rejectionText}>{(order as any).rejectionReason}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Share Footer ───────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share Invoice</Text>
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
    backgroundColor: "#0E9F6E", borderRadius: 999,
  },
  goBackText: { color: "#FFFFFF", fontWeight: "700" },

  body: { flex: 1 },

  // Status card
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
  sectionValue: { fontSize: 14, color: "#1E293B", fontWeight: "500", lineHeight: 20 },
  sectionSubValue: { fontSize: 13, color: "#64748B", marginTop: 2 },

  // Items
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  qtyBadge: {
    backgroundColor: "#FEF3C7", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, minWidth: 30, alignItems: "center",
  },
  qtyText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  itemName: { flex: 1, fontSize: 13, color: "#1E293B", fontWeight: "500" },
  itemTotal: { fontSize: 13, fontWeight: "700", color: "#1E293B" },

  // Pricing
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  priceLabel: { fontSize: 13, color: "#64748B" },
  priceValue: { fontSize: 13, color: "#1E293B", fontWeight: "500" },
  totalRow: {
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  totalValue: { fontSize: 15, fontWeight: "800", color: "#0E9F6E" },

  // Address type
  addressTypePill: {
    alignSelf: "flex-start", marginTop: 6,
    backgroundColor: "#F1F5F9", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  addressTypeText: { fontSize: 11, fontWeight: "600", color: "#64748B" },

  // Tracking
  trackRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  trackDotCol: { alignItems: "center", width: 14 },
  trackDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#CBD5E1", marginTop: 3,
  },
  trackDotActive: { backgroundColor: "#0E9F6E", width: 12, height: 12, borderRadius: 6 },
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
    backgroundColor: "#FFFFFF", paddingTop: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: "#F1F5F9",
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: -3 }, shadowRadius: 8, elevation: 8,
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F59E0B", borderRadius: 999, paddingVertical: 14,
  },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
