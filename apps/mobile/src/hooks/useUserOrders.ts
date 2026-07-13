import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useUserApp } from "@hooks/useUserApp";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { addItem, clearCart } from "@store/slices/cartSlice";
import { effectiveOrderStatus } from "@utils/orderAcceptance";
import { Order, OrderStatus } from "@/types";
import content from "@/content/orders.json";

/** Returns the set of businessIds that are currently suspended. */
function useSuspendedBusinessIds(): Set<string> {
  const businesses = useAppSelector((s) => s.userApp.businesses);
  return useMemo(
    () =>
      new Set(
        businesses
          .filter((b) => !!(b as any).suspendedAt)
          .map((b) => b.id)
      ),
    [businesses]
  );
}

export type OrderFilterKey = "all" | "active" | "completed";

export const ORDER_FILTERS: { key: OrderFilterKey; label: string }[] = [
  { key: "all", label: content.filters.all },
  { key: "active", label: content.filters.active },
  { key: "completed", label: content.filters.completed },
];

const ACTIVE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

/**
 * Encapsulates all logic for the customer orders screen: loading,
 * Firestore real-time order sync, status filtering, cancel/reorder actions,
 * and the rating/refund modal state.
 */
export const useUserOrders = () => {
  const { orders, isLoading, loadMyOrders, cancelOrder } = useUserApp();
  const [activeFilter, setActiveFilter] = useState<OrderFilterKey>("all");
  const dispatch = useAppDispatch();
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const suspendedBusinessIds = useSuspendedBusinessIds();
  const toast = useToast();
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  const handleReorder = useCallback(
    (order: Order) => {
      const bizId = order.businessId;
      const bizName = (order as any).businessName ?? content.card.defaultShop;

      const doReorder = () => {
        dispatch(clearCart());
        (order.items as any[]).forEach((item) => {
          dispatch(
            addItem({
              productId: item.productId,
              productName: item.productName ?? content.card.defaultProduct,
              productImage: item.productImage ?? null,
              businessId: bizId,
              businessName: bizName,
              price: item.price,
              quantity: item.quantity,
              maxQuantity: item.stock ?? 99,
            })
          );
        });
        router.push("/(user)/cart");
      };

      if (cartBusinessId && cartBusinessId !== bizId) {
        Alert.alert(content.alerts.replaceTitle, content.alerts.replaceMessage, [
          { text: content.alerts.keepCart, style: "cancel" },
          { text: content.alerts.reorder, style: "destructive", onPress: doReorder },
        ]);
      } else {
        doReorder();
      }
    },
    [cartBusinessId, dispatch]
  );

  useEffect(() => {
    loadMyOrders().catch(() => null);
  }, [loadMyOrders]);

  // Local ticker so a pending order flips to "Rejected" the moment its window
  // lapses on the client clock.
  const hasPending = useMemo(
    () => orders.some((o) => o.status === OrderStatus.PENDING),
    [orders]
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "active") {
      return orders.filter((item) => ACTIVE_STATUSES.includes(effectiveOrderStatus(item, now)));
    }
    if (activeFilter === "completed") {
      return orders.filter((item) => {
        const s = effectiveOrderStatus(item, now);
        return (
          s === OrderStatus.DELIVERED ||
          s === OrderStatus.CANCELLED ||
          s === OrderStatus.REJECTED
        );
      });
    }
    return orders;
  }, [activeFilter, orders, now]);

  const refresh = useCallback(() => {
    loadMyOrders().catch(() => null);
  }, [loadMyOrders]);

  const handleCancel = useCallback(
    (orderId: string) => {
      Alert.alert(content.alerts.cancelTitle, content.alerts.cancelMessage, [
        { text: content.alerts.cancelNo, style: "cancel" },
        {
          text: content.alerts.cancelYes,
          style: "destructive",
          onPress: () => {
            cancelOrder(orderId)
              .then(() => refresh())
              .catch(() => null);
          },
        },
      ]);
    },
    [cancelOrder, refresh]
  );

  const openOrderDetail = useCallback(
    (orderId: string) => router.push(`/(user)/order-detail?orderId=${orderId}`),
    []
  );
  const goToHome = useCallback(() => router.push("/(user)/home"), []);

  const closeRating = useCallback(() => setRatingOrder(null), []);
  const closeRefund = useCallback(() => setRefundOrder(null), []);

  const handleRatingSubmitted = useCallback(() => {
    setRatingOrder(null);
    toast.show(content.toasts.reviewSubmitted, { type: "success" });
  }, [toast]);

  const handleRefundSubmitted = useCallback(() => {
    setRefundOrder(null);
    toast.show(content.toasts.refundSubmitted, { type: "success", duration: 4000 });
    refresh();
  }, [refresh, toast]);

  return {
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
    openOrderDetail,
    goToHome,
    closeRating,
    closeRefund,
    handleRatingSubmitted,
    handleRefundSubmitted,
    suspendedBusinessIds,
  };
};
