import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { OrderStatus } from "@/types";
import SafeAreaScreen from "@components/SafeAreaScreen";
import SafeAreaHeader from "@components/SafeAreaHeader";
import AcceptanceCountdown from "@components/AcceptanceCountdown";
import { useOrderDetail } from "@hooks/useOrderDetail";
import content from "@/content/orderDetail.json";

export default function UserOrderDetail() {
  const insets = useSafeAreaInsets();
  const {
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
    formatDateTime,
    handleShare,
    goBack,
    refetchOrder,
  } = useOrderDetail();

  if (fetching) {
    return (
      <SafeAreaScreen backgroundColor="#0E9F6E">
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaScreen>
    );
  }

  if (!order || !displayStatus || !statusMeta) {
    return (
      <SafeAreaScreen backgroundColor="#F8FAFC">
        <View style={styles.fullCenter}>
          <Text style={styles.notFoundText}>{content.notFound.title}</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={goBack}>
            <Text style={styles.goBackText}>{content.notFound.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaHeader
        title={`${content.invoice.order} #${(order.id ?? "").slice(0, 8).toUpperCase()}`}
        subtitle={formatDateTime(order.createdAt)}
        colors={["#0E9F6E", "#0891B2"] as const}
        showBackButton
        onBackPress={goBack}
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
              {content.statusLabels[displayStatus] ?? displayStatus}
            </Text>
            <Text style={[styles.statusPayment, { color: statusMeta.text }]}>
              {paymentMethod.toUpperCase()} ·{" "}
              {order.paymentStatus === "cod"
                ? content.paymentStatus.cod
                : order.paymentStatus === "completed"
                ? content.paymentStatus.completed
                : content.paymentStatus.pending}
            </Text>
          </View>
        </View>

        {/* ── Awaiting store confirmation countdown ────────────────── */}
        {displayStatus === OrderStatus.PENDING && awaitingDeadlineMs != null ? (
          <View style={styles.awaitingCard}>
            <Text style={styles.awaitingText}>{content.awaiting}</Text>
            <AcceptanceCountdown
              deadlineMs={awaitingDeadlineMs}
              onExpire={refetchOrder}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
            />
          </View>
        ) : null}

        {/* ── Shop ─────────────────────────────────────────────────── */}
        {(order as any).businessName ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{content.sections.shop}</Text>
            <Text style={styles.sectionValue}>{(order as any).businessName}</Text>
          </View>
        ) : null}

        {/* ── Items ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{content.sections.items} ({orderItems.length}{content.sections.itemsCountSuffix}</Text>
          {orderItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}×</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName ?? `Item ${idx + 1}`}
              </Text>
              <Text style={styles.itemTotal}>
                {content.currency}{item.lineTotal ?? item.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Pricing ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{content.sections.pricing}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{content.sections.subtotal}</Text>
            <Text style={styles.priceValue}>{content.currency}{order.subTotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{content.sections.platformFee}</Text>
            <Text style={styles.priceValue}>{content.currency}{order.platformFee}</Text>
          </View>
          {order.discountAmount ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{content.sections.discount}</Text>
              <Text style={[styles.priceValue, { color: "#16A34A" }]}>−{content.currency}{order.discountAmount}</Text>
            </View>
          ) : null}
          {order.taxAmount ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{content.sections.tax}</Text>
              <Text style={styles.priceValue}>{content.currency}{order.taxAmount}</Text>
            </View>
          ) : null}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{content.sections.total}</Text>
            <Text style={styles.totalValue}>{content.currency}{order.finalAmount}</Text>
          </View>
        </View>

        {/* ── Delivery Address ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{content.sections.deliveryAddress}</Text>
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
            <Text style={styles.sectionTitle}>{content.sections.orderNotes}</Text>
            <Text style={styles.sectionValue}>{order.notes}</Text>
          </View>
        ) : null}

        {/* ── Tracking Timeline ───────────────────────────────────── */}
        {order.trackingUpdates && order.trackingUpdates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{content.sections.timeline}</Text>
            {[...order.trackingUpdates].reverse().map((update, idx) => (
              <View key={idx} style={styles.trackRow}>
                <View style={styles.trackDotCol}>
                  <View style={[styles.trackDot, idx === 0 && styles.trackDotActive]} />
                  {idx < order.trackingUpdates!.length - 1 ? <View style={styles.trackLine} /> : null}
                </View>
                <View style={styles.trackContent}>
                  <Text style={[styles.trackStatus, idx === 0 && { color: "#0E9F6E" }]}>
                    {content.statusLabels[update.status] ?? update.status}
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

        {/* ── Rejection Reason (incl. client-side auto-reject) ─────── */}
        {rejectionReason ? (
          <View style={[styles.section, styles.rejectionSection]}>
            <Text style={styles.rejectionTitle}>{content.sections.rejectionTitle}</Text>
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
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
              <Text style={styles.shareBtnText}>{content.share}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
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

  // Awaiting-confirmation card
  awaitingCard: {
    marginHorizontal: 16, marginBottom: 4, padding: 14,
    borderRadius: 16, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB",
  },
  awaitingText: { fontSize: 13, fontWeight: "600", color: "#92400E" },

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
