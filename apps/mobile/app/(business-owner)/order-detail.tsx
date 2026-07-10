import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OrderStatus } from "@/types";
import SafeAreaScreen from "@components/SafeAreaScreen";
import SafeAreaHeader from "@components/SafeAreaHeader";
import AcceptanceCountdown from "@components/AcceptanceCountdown";
import { useBusinessOwnerOrderDetail } from "@hooks/useBusinessOwnerOrderDetail";
import content from "@/content/boOrderDetail.json";

export default function BusinessOwnerOrderDetail() {
  const {
    insets,
    order,
    advancing,
    sharing,
    derived,
    setDetailExpired,
    handleAdvance,
    goReject,
    handleShare,
    goBack,
    formatDateTime,
    getOrderStatusMeta,
  } = useBusinessOwnerOrderDetail();

  if (!order || !derived) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#F8FAFC" }]}>
        <Text style={styles.notFoundText}>{content.notFound.title}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={goBack}>
          <Text style={styles.goBackText}>{content.notFound.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { displayStatus, meta, addressLine, addressCity, canAdvance, isPending, deadlineMs, windowExpired, nextLabel } = derived;

  return (
    <SafeAreaScreen backgroundColor="#F8FAFC">
      <SafeAreaHeader
        title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
        subtitle={formatDateTime(order.createdAt)}
        colors={["#16A34A", "#15803D"] as const}
        showBackButton
        onBackPress={goBack}
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
              {order.paymentStatus === "cod" ? content.payment.cod :
               order.paymentStatus === "completed" ? content.payment.paid : content.payment.pending}
            </Text>
          </View>
        </View>

        {/* ── Customer Info ────────────────────────────────────────── */}
        {((order as any).userName || (order as any).userPhone) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{content.sections.customer}</Text>
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
          <Text style={styles.sectionTitle}>{content.sections.itemsPrefix}{order.items.length}{content.sections.itemsSuffix}</Text>
          {(order.items as any[]).map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}×</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName ?? `${content.invoice.itemFallback}${idx + 1}`}
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
            <Text style={styles.sectionTitle}>{content.sections.orderNotes}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="chatbubble-outline" size={15} color="#64748B" />
              <Text style={[styles.infoText, { fontStyle: "italic" }]}>{order.notes}</Text>
            </View>
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
                  <Text style={[styles.trackStatus, idx === 0 && { color: "#16A34A" }]}>
                    {getOrderStatusMeta(update.status)?.label ?? update.status}
                  </Text>
                  <Text style={styles.trackTime}>
                    {new Date(update.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(update.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {update.rejectionReason ? (
                    <Text style={styles.trackNote}>{content.sections.rejectionTitle.slice(2)} {update.rejectionReason}</Text>
                  ) : update.notes ? (
                    <Text style={styles.trackNote}>{update.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Rejection (incl. client-side auto-reject) ────────────── */}
        {displayStatus === OrderStatus.REJECTED ? (
          <View style={[styles.section, styles.rejectionSection]}>
            <Text style={styles.rejectionTitle}>{content.sections.rejectionTitle}</Text>
            <Text style={styles.rejectionText}>
              {(order as any).rejectionReason ?? content.sections.rejectionFallback}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {isPending ? (
          windowExpired ? (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredBannerText}>{content.footer.expiredBanner}</Text>
            </View>
          ) : (
            <>
              {deadlineMs != null ? (
                <AcceptanceCountdown deadlineMs={deadlineMs} onExpire={() => setDetailExpired(true)} />
              ) : null}
              <View style={styles.pendingRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={goReject}
                  disabled={advancing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.rejectBtnText}>{content.footer.reject}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptBtn, advancing && { opacity: 0.7 }]}
                  onPress={handleAdvance}
                  disabled={advancing}
                  activeOpacity={0.85}
                >
                  {advancing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.acceptBtnText}>{content.footer.accept}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )
        ) : canAdvance ? (
          <TouchableOpacity
            style={[styles.advanceBtn, advancing && { opacity: 0.7 }]}
            onPress={handleAdvance}
            disabled={advancing}
            activeOpacity={0.85}
          >
            {advancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.advanceBtnText}>{nextLabel}</Text>
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
              <Text style={[styles.shareBtnText, canAdvance && { color: "#16A34A" }]}>{content.footer.shareInvoice}</Text>
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
  pendingRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 999, paddingVertical: 14, alignItems: "center",
  },
  rejectBtnText: { fontSize: 15, fontWeight: "700", color: "#DC2626" },
  acceptBtn: {
    flex: 1, backgroundColor: "#16A34A", borderRadius: 999,
    paddingVertical: 14, alignItems: "center",
  },
  acceptBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  expiredBanner: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 12, paddingVertical: 13, alignItems: "center",
  },
  expiredBannerText: { fontSize: 14, fontWeight: "700", color: "#991B1B" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#16A34A", borderRadius: 999, paddingVertical: 13,
  },
  shareBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
