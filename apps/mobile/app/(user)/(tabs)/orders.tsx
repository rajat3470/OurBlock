import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Order, OrderStatus } from "../../../src/types";
import RatingModal from "../../../src/components/RatingModal";
import RefundModal from "../../../src/components/RefundModal";
import {
  effectiveOrderStatus,
  ORDER_AUTO_REJECT_REASON,
} from "../../../src/utils/orderAcceptance";
import { LinearGradient } from "expo-linear-gradient";
import { ORDER_FILTERS, useUserOrders } from "@hooks/useUserOrders";
import content from "@/content/orders.json";
import { router } from "expo-router";
import { useAppSelector } from "@/hooks/useRedux";

export default function UserOrders() {
  const insets = useSafeAreaInsets();
  const {
    orders,
    isLoading,
    activeFilter,
    setActiveFilter,
    filteredOrders,
    now,
    ratingOrder,
    refundOrder,
    setRatingOrder,
    setRefundOrder,
    handleReorder,
    handleCancel,
    refresh,
    goToHome,
    closeRating,
    closeRefund,
    handleRatingSubmitted,
    handleRefundSubmitted,
  } = useUserOrders();
  
  const businesses = useAppSelector((state) => state.userApp.businesses);
  const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
    pending:         { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
    confirmed:       { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
    preparing:       { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
    ready:           { bg: "#F0FDF4", border: "#86EFAC", text: "#15803D" },
    outForDelivery:  { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8" },
    delivered:       { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" },
    cancelled:       { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
    rejected:        { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  };
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
  function getStatusStyle(status: string) {
    return STATUS_COLOR[status] ?? STATUS_COLOR.pending;
  }


  const renderItem = ({ item }: { item: Order }) => {
    const displayStatus = effectiveOrderStatus(item, now);
    const statusStyle = getStatusStyle(displayStatus);
    const orderItems = Array.isArray((item as any).items) ? (item as any).items : [];
    const canCancel =
      displayStatus === OrderStatus.PENDING || displayStatus === OrderStatus.CONFIRMED;
    const rejectionReason =
      displayStatus === OrderStatus.REJECTED
        ? (item as any).rejectionReason ?? ORDER_AUTO_REJECT_REASON
        : null;
    const business = businesses.find((biz) => biz.id === item.businessId);
    const businessStatus = (business?.status ?? (item as any).businessStatus ?? (item as any).business?.status) as string | undefined;
    // If status is unknown we cannot confirm the vendor is active, so treat as unavailable
    const vendorActive = businessStatus === "active";
    const vendorUnavailable = Boolean(businessStatus && businessStatus !== "active");
    const vendorSuspended = Boolean(businessStatus && businessStatus !== "active");

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(user)/order-detail?orderId=${item.id}`)}
        activeOpacity={0.97}
      >
        {/* Top row */}
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.businessName}>{(item as any).businessName ?? "Shop"}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.amount}>Rs {item.finalAmount}</Text>
            <Text style={styles.orderMeta}>{orderItems.length} item{orderItems.length !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        {/* Items list */}
        {orderItems.slice(0, 3).map((orderItem: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemQty}>{orderItem.quantity}×</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {orderItem.productName ?? `Item ${idx + 1}`}
            </Text>
            <Text style={styles.itemPrice}>Rs {orderItem.lineTotal ?? orderItem.price * orderItem.quantity}</Text>
          </View>
        ))}
        {orderItems.length > 3 ? (
          <Text style={styles.moreItems}>+{orderItems.length - 3} more items</Text>
        ) : null}

        {/* Price breakdown */}
        <View style={styles.priceBreakdown}>
          <Text style={styles.priceBreakdownText}>
            Subtotal: Rs {(item as any).subTotal ?? item.totalAmount} · Platform fee: Rs {(item as any).platformFee ?? 2}
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
          <Text style={styles.paymentText}>
            {item.paymentStatus === "cod"
              ? "Cash on Delivery"
              : item.paymentStatus === "completed"
              ? "Paid"
              : item.paymentStatus === "failed"
              ? "Payment Failed"
              : "Pending"}
          </Text>
        </View>

        {/* Action buttons */}
        {(() => {
          const isClosed =
            displayStatus === OrderStatus.DELIVERED ||
            displayStatus === OrderStatus.CANCELLED ||
            displayStatus === OrderStatus.REJECTED;
          const showReorder = isClosed && vendorActive;
          const showNotAvailable = isClosed && vendorSuspended;
          const showRate = displayStatus === OrderStatus.DELIVERED;
          const showRefund =
            displayStatus === OrderStatus.DELIVERED && !(item as any).refundRequested;
          if (!canCancel && !showReorder && !showRate && !showRefund && !showNotAvailable) return null;
          return (
            <View style={styles.actionRow}>
              {canCancel ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item.id)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
              {showReorder ? (
                <TouchableOpacity
                  style={styles.reorderBtn}
                  onPress={() => handleReorder(item)}
                >
                  <Ionicons name="refresh" size={12} color="#0E9F6E" />
                  <Text style={styles.reorderBtnText}>Reorder</Text>
                </TouchableOpacity>
              ) : null}
              {showRate ? (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={() => setRatingOrder(item)}
                >
                  <Ionicons name="star-outline" size={12} color="#D97706" />
                  <Text style={styles.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              ) : null}
              {showRefund ? (
                <TouchableOpacity
                  style={styles.refundBtn}
                  onPress={() => setRefundOrder(item)}
                >
                  <Ionicons name="return-up-back-outline" size={12} color="#7C3AED" />
                  <Text style={styles.refundBtnText}>Refund</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })()}
        {/* Show rejection reason if order was rejected (incl. client-side auto-reject) */}
        {rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionLabel}>Rejection reason:</Text>
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
          </View>
        ) : null}
        {vendorUnavailable ? (
          <View style={styles.unavailableBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
            <Text style={styles.unavailableText}>This vendor is no longer available.</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0E9F6E", "#0891B2"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{content.header.subtitle}</Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        {ORDER_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              activeFilter === filter.key ? styles.filterBtnActive : null,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter.key ? styles.filterLabelActive : null,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0E9F6E" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refresh}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="receipt-outline" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={goToHome}>
                <Text style={styles.browseBtnText}>{content.empty.browse}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {ratingOrder ? (
        <RatingModal
          visible
          orderId={ratingOrder.id}
          businessId={ratingOrder.businessId}
          businessName={(ratingOrder as any).businessName ?? content.card.defaultShop}
          onClose={closeRating}
          onSubmitted={handleRatingSubmitted}
        />
      ) : null}

      {refundOrder ? (
        <RefundModal
          visible
          orderId={refundOrder.id}
          orderAmount={(refundOrder as any).finalAmount ?? 0}
          businessName={(refundOrder as any).businessName ?? content.card.defaultShop}
          onClose={closeRefund}
          onSubmitted={handleRefundSubmitted}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  filterBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterBtnActive: { backgroundColor: "#0E9F6E", borderColor: "#0E9F6E" },
  filterLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  filterLabelActive: { color: "#FFFFFF" },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
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
  notAvailableTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  notAvailableText: { fontSize: 11, fontWeight: "700", color: "#991B1B" },
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
  emptyWrap: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E9F6E",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  browseBtn: {
    marginTop: 8,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  browseBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
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
  unavailableBanner: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unavailableText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
});

