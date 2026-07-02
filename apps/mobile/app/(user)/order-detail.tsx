import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserApp } from "../../src/hooks/useUserApp";
import { userAppService } from "../../src/services/userAppService";
import { Order, OrderStatus } from "../../src/types";

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
  const itemLines = (order.items as any[])
    .map((i) => `  • ${i.quantity}x ${i.productName ?? "Item"} — Rs ${i.lineTotal ?? i.price * i.quantity}`)
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
      <LinearGradient colors={["#DC2626", "#991B1B"]} style={[styles.fullCenter, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </LinearGradient>
    );
  }

  if (!order) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#F8FAFC" }]}>
        <Text style={styles.notFoundText}>Order not found.</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(user)/(tabs)/orders")}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = STATUS_COLOR[order.status] ?? STATUS_COLOR.pending;
  const addr = order.deliveryAddress as any;
  const addressLine = [addr?.street, addr?.landmark].filter(Boolean).join(", ");
  const addressCity = [addr?.city, addr?.state, addr?.pinCode].filter(Boolean).join(", ");

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#DC2626", "#991B1B"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(user)/(tabs)/orders");
              }
            }}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.headerSub}>{formatDateTime(order.createdAt)}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

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
              {order.paymentMethod.toUpperCase()} ·{" "}
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
                  <Text style={[styles.trackStatus, idx === 0 && { color: "#DC2626" }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  fullCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFoundText: { fontSize: 15, color: "#64748B", marginBottom: 12 },
  goBackBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: "#DC2626", borderRadius: 999,
  },
  goBackText: { color: "#FFFFFF", fontWeight: "700" },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38, height: 38, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  headerRight: { width: 38 },

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
  totalValue: { fontSize: 15, fontWeight: "800", color: "#DC2626" },

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
  trackDotActive: { backgroundColor: "#DC2626", width: 12, height: 12, borderRadius: 6 },
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
    backgroundColor: "#DC2626", borderRadius: 999, paddingVertical: 14,
  },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
