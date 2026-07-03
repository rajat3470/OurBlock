import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useBusinessOwner } from "../../src/hooks/useBusinessOwner";
import { Order, OrderStatus } from "../../src/types";
import { useAppDispatch } from "../../src/hooks/useRedux";
import { prependOrder } from "../../src/store/slices/businessOwnerSlice";
import { useSocketEvent } from "../../src/hooks/useSocket";
import { socketService } from "../../src/services/socketService";
import { LinearGradient } from "expo-linear-gradient";

type FilterKey = "all" | "pending" | "active" | "done";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

const DONE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED];

const STATUS_META: Record<string, { label: string; color: string; bg: string; emoji: string; border: string }> = {
  [OrderStatus.PENDING]:          { label: "New Order",         color: "#D97706", bg: "#FFFBEB", emoji: "🔔", border: "#FDE68A" },
  [OrderStatus.CONFIRMED]:        { label: "Accepted",          color: "#2563EB", bg: "#EFF6FF", emoji: "✅", border: "#BFDBFE" },
  [OrderStatus.PREPARING]:        { label: "Processing",        color: "#7C3AED", bg: "#F5F3FF", emoji: "⚙️", border: "#DDD6FE" },
  [OrderStatus.READY]:            { label: "Ready to Collect",  color: "#059669", bg: "#ECFDF5", emoji: "📦", border: "#A7F3D0" },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: "On the Way",        color: "#0284C7", bg: "#F0F9FF", emoji: "🚚", border: "#BAE6FD" },
  [OrderStatus.DELIVERED]:        { label: "Completed",         color: "#16A34A", bg: "#DCFCE7", emoji: "🎉", border: "#86EFAC" },
  [OrderStatus.CANCELLED]:        { label: "Cancelled",         color: "#DC2626", bg: "#FEF2F2", emoji: "✗",  border: "#FECACA" },
  [OrderStatus.REJECTED]:         { label: "Rejected",          color: "#991B1B", bg: "#FEF2F2", emoji: "🚫", border: "#FECACA" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PENDING]:          OrderStatus.CONFIRMED,
  [OrderStatus.CONFIRMED]:        OrderStatus.PREPARING,
  [OrderStatus.PREPARING]:        OrderStatus.READY,
  [OrderStatus.READY]:            OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.CONFIRMED]:        "⚙️ Start Processing",
  [OrderStatus.PREPARING]:        "📦 Mark Ready",
  [OrderStatus.READY]:            "🚚 Out for Delivery",
  [OrderStatus.OUT_FOR_DELIVERY]: "✅ Mark Completed",
};

function normalizeOrderPayload(payload: any): Order | null {
  const raw = payload?.order ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id && raw._id) {
    return { ...raw, id: raw._id } as Order;
  }
  return raw as Order;
}

function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function BusinessOwnerOrders() {
  const { orders, isLoading, loadOrders, changeOrderStatus, rejectOrder } = useBusinessOwner();
  const { rejectOrderId } = useLocalSearchParams<{ rejectOrderId?: string }>();
  const dispatch = useAppDispatch();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; orderRef: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const insets = useSafeAreaInsets();
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());

  const getFallbackDelayMs = useCallback(() => {
    const elapsed = Date.now() - lastActivityAtRef.current;
    if (elapsed < 30_000) return 3_000;
    if (elapsed < 180_000) return 10_000;
    return 30_000;
  }, []);

  const refreshFallbackNow = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    if (!socketService.isConnected()) {
      loadOrders({ silent: true }).catch(() => null);
    }
  }, [loadOrders]);

  const stopFallbackLoop = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const startFallbackLoop = useCallback(() => {
    stopFallbackLoop();

    const tick = () => {
      if (!socketService.isConnected()) {
        loadOrders({ silent: true }).catch(() => null);
      }
      fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
    };

    fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
  }, [getFallbackDelayMs, loadOrders, stopFallbackLoop]);

  // Track previous pending count to detect new orders
  const prevPendingCount = useRef<number>(0);

  useEffect(() => {
    loadOrders().catch(() => null);
  }, [loadOrders]);

  // Fallback path while backend socket events are unavailable: sync only when
  // this screen is focused and socket is disconnected.
  useFocusEffect(
    useCallback(() => {
      // Immediate refresh on focus (covers notification tap navigation too).
      refreshFallbackNow();
      startFallbackLoop();

      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          // Meaningful event: app foreground resume.
          refreshFallbackNow();
        }
      });

      return () => {
        sub.remove();
        stopFallbackLoop();
      };
    }, [refreshFallbackNow, startFallbackLoop, stopFallbackLoop])
  );

  // Real-time: a new order has arrived via socket.
  // prependOrder guards against duplicates if FCM also triggers a refresh.
  // The existing useEffect watching `orders` will detect the new pending order
  // and fire playNewOrderAlert() automatically.
  useSocketEvent<any>("order:new", (payload) => {
    const order = normalizeOrderPayload(payload);
    if (!order?.id) return;
    dispatch(prependOrder(order));
  });

  // Ring/buzz when a new pending order arrives
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === OrderStatus.PENDING).length;
    if (pendingCount > prevPendingCount.current) {
      playNewOrderAlert();
    }
    prevPendingCount.current = pendingCount;
  }, [orders]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {};
  }, []);

  const playNewOrderAlert = async () => {
    try {
      // Zomato-style short-long-short-long vibration pattern
      Vibration.vibrate([0, 400, 200, 400, 200, 600]);
    } catch {
      Vibration.vibrate([0, 300, 200, 300]);
    }
  };

  const counts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((o) => o.status === OrderStatus.PENDING).length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      done: orders.filter((o) => DONE_STATUSES.includes(o.status)).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === "pending") return orders.filter((o) => o.status === OrderStatus.PENDING);
    if (activeFilter === "active") return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (activeFilter === "done") return orders.filter((o) => DONE_STATUSES.includes(o.status));
    return orders;
  }, [activeFilter, orders]);

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: counts.all     },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "active",  label: "Active",  count: counts.active  },
    { key: "done",    label: "Done",    count: counts.done    },
  ];

  const handleAdvance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(order.id);
    try {
      await changeOrderStatus(order.id, next);
      refreshFallbackNow();
    } catch {
      Alert.alert("Error", "Failed to update order status. Please try again.");
    } finally {
      setAdvancing(null);
    }
  };

  const handleAccept = async (order: Order) => {
    setAdvancing(order.id);
    try {
      await changeOrderStatus(order.id, OrderStatus.CONFIRMED);
      refreshFallbackNow();
    } catch {
      Alert.alert("Error", "Failed to accept order. Please try again.");
    } finally {
      setAdvancing(null);
    }
  };

  const openRejectModal = (order: Order) => {
    setRejectReason("");
    setRejectModal({ orderId: order.id, orderRef: order.id.slice(0, 8).toUpperCase() });
  };

  // Open reject modal when arriving from a notification "Reject" action
  useEffect(() => {
    if (!rejectOrderId || typeof rejectOrderId !== "string") return;
    const order = orders.find((o) => o.id === rejectOrderId);
    if (!order || order.status !== OrderStatus.PENDING) return;
    openRejectModal(order);
    router.setParams({ rejectOrderId: undefined });
  }, [rejectOrderId, orders]);

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for rejecting this order.");
      return;
    }

    setRejecting(true);
    try {
      await rejectOrder(rejectModal.orderId, rejectReason.trim());
      setRejectModal(null);
      setRejectReason("");
      refreshFallbackNow();
    } catch {
      Alert.alert("Error", "Failed to reject order. Please try again.");
    } finally {
      setRejecting(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const meta = STATUS_META[item.status];
    const next = NEXT_STATUS[item.status];
    const nextLabel = NEXT_STATUS_LABEL[item.status];
    const addr = item.deliveryAddress;
    const addressLine = addr
      ? [addr.street, addr.landmark].filter(Boolean).join(", ")
      : null;
    const isAdvancing = advancing === item.id;
    const orderItems = Array.isArray((item as any).items) ? (item as any).items : [];
    const paymentMethod = item.paymentMethod ?? "cash";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(business-owner)/order-detail?orderId=${item.id}`)}
      >
        {/* Top row: ID + time + amount */}
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.orderAmount}>₹{item.finalAmount}</Text>
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
                ? "Paid"
                : item.paymentStatus === "cod"
                ? "COD"
                : "Pending"}
            </Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🛍</Text>
            <Text style={styles.infoText}>
              {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {/* Item names */}
          {orderItems.slice(0, 3).map((orderItem: any, idx: number) => (
            <View key={idx} style={styles.infoRow}>
              <Text style={styles.infoIcon}>  ·</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {orderItem.quantity}× {orderItem.productName ?? `Item ${idx + 1}`} — Rs {orderItem.lineTotal ?? orderItem.price * orderItem.quantity}
              </Text>
            </View>
          ))}
          {orderItems.length > 3 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>  ·</Text>
              <Text style={styles.infoText}>+{orderItems.length - 3} more</Text>
            </View>
          ) : null}
          {/* Customer info */}
          {(item as any).userName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👤</Text>
              <Text style={styles.infoText}>{(item as any).userName}{(item as any).userPhone ? ` · ${(item as any).userPhone}` : ""}</Text>
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
        {item.status === OrderStatus.PENDING ? (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.rejectBtn, isAdvancing && styles.advanceBtnDisabled]}
              onPress={() => openRejectModal(item)}
              disabled={isAdvancing}
              activeOpacity={0.85}
            >
              <Text style={styles.rejectBtnText}>✕ Reject</Text>
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
                <Text style={styles.acceptBtnText}>✓ Accept</Text>
              )}
            </TouchableOpacity>
          </View>
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
                ? "✅ Order completed"
                : item.status === OrderStatus.REJECTED
                ? "🚫 Order rejected"
                : "✗ Order cancelled"}
            </Text>
            {item.status === OrderStatus.REJECTED && (item as any).rejectionReason ? (
              <Text style={styles.rejectionReasonText}>
                Reason: {(item as any).rejectionReason}
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
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSub}>Track and fulfill customer orders</Text>
      </LinearGradient>

      {/* Filter bar — plain View row so chips stay compact */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => {
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
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No orders here</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === "all"
                  ? "Customer orders will appear once they start placing them."
                  : "No orders match this filter right now."}
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
            <Text style={styles.modalTitle}>Reject Order #{rejectModal?.orderRef}</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason. The customer will be notified.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Out of stock, Shop is closed, Item unavailable..."
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
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, rejecting && styles.advanceBtnDisabled]}
                onPress={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
