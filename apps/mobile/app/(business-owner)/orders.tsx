import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Order, OrderStatus } from "@/types";
import AcceptanceCountdown from "@components/AcceptanceCountdown";
import { DeliveryPartnerPickerModal } from "@components/business-owner/DeliveryPartnerPickerModal";
import { useBusinessOwnerOrders } from "@hooks/useBusinessOwnerOrders";
import content from "@/content/boOrders.json";

export default function BusinessOwnerOrders() {
  const insets = useSafeAreaInsets();
  const {
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
    partnerPicker,
    partnerOptions,
    partnerPickerLoading,
    handlePartnerSelected,
    closePartnerPicker,
  } = useBusinessOwnerOrders();

  const renderItem = ({ item }: { item: Order }) => {
    const displayStatus = effectiveOrderStatus(item, now);
    const meta = getOrderStatusMeta(displayStatus);
    const next = getNextStatus(displayStatus);
    const nextLabel = getNextStatusLabel(displayStatus);
    const addr = item.deliveryAddress;
    const addressLine = addr
      ? [addr.street, addr.landmark].filter(Boolean).join(", ")
      : null;
    const isAdvancing = advancing === item.id;
    const orderItems = Array.isArray((item as any).items) ? (item as any).items : [];
    const paymentMethod = item.paymentMethod ?? "cash";
    const isPending = item.status === OrderStatus.PENDING;
    const deadlineMs = isPending ? getAcceptanceDeadlineMs(item) : null;
    const windowExpired =
      isPending && ((deadlineMs != null && Date.now() >= deadlineMs) || expiredIds.has(item.id));

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => goToOrderDetail(item.id)}
      >
        {/* Top row: ID + time + amount */}
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={styles.orderAmount}>{content.currency}{item.finalAmount}</Text>
            {isPending && deadlineMs != null && !windowExpired ? (
              <AcceptanceCountdown
                compact
                deadlineMs={deadlineMs}
                onExpire={() => handleCountdownExpire(item.id)}
              />
            ) : null}
          </View>
        </View>

        {/* Status + payment row */}
        <View style={[styles.statusBar, { backgroundColor: meta?.bg ?? "#F1F5F9", borderColor: meta?.border ?? "#E2E8F0" }]}>
          <Text style={[styles.statusBarText, { color: meta?.color ?? "#64748B" }]}>
            {meta?.emoji}  {meta?.label ?? item.status}
          </Text>
          <View
            style={[
              styles.paymentBadge,
              item.paymentStatus === "completed"
                ? styles.paymentBadgePaid
                : item.paymentStatus === "cod"
                ? styles.paymentBadgeCod
                : styles.paymentBadgePending,
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color:
                    item.paymentStatus === "completed"
                      ? "#166534"
                      : item.paymentStatus === "cod"
                      ? "#1E40AF"
                      : "#92400E",
                },
              ]}
            >
              {paymentMethod.toUpperCase()} ·{" "}
              {item.paymentStatus === "completed"
                ? content.payment.paid
                : item.paymentStatus === "cod"
                ? content.payment.cod
                : content.payment.pending}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🛍</Text>
            <Text style={styles.infoText}>
              {orderItems.length} {orderItems.length !== 1 ? content.card.itemPlural : content.card.itemSingular}
            </Text>
          </View>
          {/* Item names */}
          {orderItems.slice(0, 3).map((orderItem: any, idx: number) => (
            <View key={idx} style={styles.infoRow}>
              <Text style={styles.infoIcon}>  ·</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {orderItem.quantity}× {orderItem.productName ?? `${content.card.itemFallbackPrefix}${idx + 1}`} — {content.currency}{orderItem.lineTotal ?? orderItem.price * orderItem.quantity}
              </Text>
            </View>
          ))}
          {orderItems.length > 3 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>  ·</Text>
              <Text style={styles.infoText}>+{orderItems.length - 3}{content.card.moreSuffix}</Text>
            </View>
          ) : null}
          {/* Customer info */}
          {(item as any).userName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <Text style={styles.infoText}>{(item as any).userName}{(item as any).userPhone ? ` · ${(item as any).userPhone}` : ""}</Text>
            </View>
          ) : null}
          {(item as any).assignedDeliveryPartnerName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🛵</Text>
              <Text style={styles.infoText}>{(item as any).assignedDeliveryPartnerName}</Text>
            </View>
          ) : null}
          {addressLine ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText} numberOfLines={2}>{addressLine}</Text>
            </View>
          ) : null}
          {item.notes ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💬</Text>
              <Text style={[styles.infoText, styles.infoNote]} numberOfLines={2}>{item.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action */}
        {isPending && windowExpired ? (
          <View style={styles.terminalBanner}>
            <Text style={styles.terminalBannerText}>{content.card.autoRejected}</Text>
          </View>
        ) : item.status === OrderStatus.PENDING ? (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.rejectBtn, isAdvancing && styles.advanceBtnDisabled]}
              onPress={() => openRejectModal(item)}
              disabled={isAdvancing}
              activeOpacity={0.85}
            >
              <Text style={styles.rejectBtnText}>{content.card.reject}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, isAdvancing && styles.advanceBtnDisabled]}
              onPress={() => handleAccept(item)}
              disabled={isAdvancing}
              activeOpacity={0.85}
            >
              {isAdvancing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptBtnText}>{content.card.accept}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : item.status === OrderStatus.OUT_FOR_DELIVERY &&
          !(item as any).assignedDeliveryPartnerId ? (
          <TouchableOpacity
            style={[styles.advanceBtn, isAdvancing && styles.advanceBtnDisabled]}
            onPress={() => handleAssignMissingPartner(item)}
            disabled={isAdvancing}
            activeOpacity={0.85}
          >
            {isAdvancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.advanceBtnText}>Assign Partner</Text>
            )}
          </TouchableOpacity>
        ) : next ? (
          <TouchableOpacity
            style={[styles.advanceBtn, isAdvancing && styles.advanceBtnDisabled]}
            onPress={() => handleAdvance(item)}
            disabled={isAdvancing}
            activeOpacity={0.85}
          >
            {isAdvancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.advanceBtnText}>{nextLabel}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.terminalBanner}>
            <Text style={styles.terminalBannerText}>
              {item.status === OrderStatus.DELIVERED
                ? content.card.completed
                : item.status === OrderStatus.REJECTED
                ? content.card.rejected
                : content.card.cancelled}
            </Text>
            {item.status === OrderStatus.REJECTED && (item as any).rejectionReason ? (
              <Text style={styles.rejectionReasonText}>
                {content.card.reasonPrefix}{(item as any).rejectionReason}
              </Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#16A34A", "#0A7D55"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{content.header.subtitle}</Text>
      </LinearGradient>

      {/* Filter bar — plain View row so chips stay compact */}
      <View style={styles.filterBar}>
        {filters.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.filterBadge, active ? styles.filterBadgeActive : styles.filterBadgeInactive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && orders.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{content.empty.emoji}</Text>
              <Text style={styles.emptyTitle}>{content.empty.title}</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === "all"
                  ? content.empty.subtitleAll
                  : content.empty.subtitleFiltered}
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Order Modal */}
      <Modal
        visible={!!rejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => !rejecting && setRejectModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{content.rejectModal.titlePrefix}{rejectModal?.orderRef}</Text>
            <Text style={styles.modalSubtitle}>
              {content.rejectModal.subtitle}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={content.rejectModal.placeholder}
              placeholderTextColor="#94A3B8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              maxLength={200}
              autoFocus
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{rejectReason.length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal(null)}
                disabled={rejecting}
              >
                <Text style={styles.modalCancelText}>{content.rejectModal.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, rejecting && styles.advanceBtnDisabled]}
                onPress={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRejectText}>{content.rejectModal.reject}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delivery Partner Picker */}
      <DeliveryPartnerPickerModal
        visible={!!partnerPicker}
        partners={partnerOptions}
        loading={partnerPickerLoading}
        preselectedId={partnerPicker?.preselectedId}
        onSelect={handlePartnerSelected}
        onClose={closePartnerPicker}
      />
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

  // ── Filter bar ────────────────────────────────────────────────────────────
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#064E3B",
    borderColor: "#064E3B",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  filterBadgeInactive: {
    backgroundColor: "#E2E8F0",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  filterBadgeTextActive: {
    color: "#FFFFFF",
  },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 14,
    paddingBottom: 130,
    gap: 12,
  },

  // ── Order Card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  orderTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Status strip
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusBarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentBadgePaid: { backgroundColor: "#DCFCE7" },
  paymentBadgePending: { backgroundColor: "#FEF3C7" },
  paymentBadgeCod: { backgroundColor: "#DBEAFE" },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Info section
  infoSection: {
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoIcon: {
    fontSize: 13,
    marginTop: 1,
    width: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
    lineHeight: 19,
  },
  infoNote: {
    fontStyle: "italic",
    color: "#64748B",
    fontSize: 12,
  },

  // Action
  advanceBtn: {
    margin: 12,
    backgroundColor: "#064E3B",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  advanceBtnDisabled: { opacity: 0.6 },
  advanceBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Pending order: Accept + Reject split buttons
  pendingActions: {
    flexDirection: "row",
    margin: 12,
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  rejectBtnText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  acceptBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#064E3B",
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  terminalBanner: {
    margin: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  terminalBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  rejectionReasonText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
    fontStyle: "italic",
  },

  // ── Reject Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 19,
  },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 90,
    backgroundColor: "#F8FAFC",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  modalRejectBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#DC2626",
  },
  modalRejectText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 21,
  },
});
