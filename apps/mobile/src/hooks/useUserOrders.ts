import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useUserApp } from "@hooks/useUserApp";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { useSocketEvent } from "@hooks/useSocket";
import { addItem, clearCart } from "@store/slices/cartSlice";
import { updateOrderInStore } from "@store/slices/userAppSlice";
import { socketService } from "@services/socketService";
import { effectiveOrderStatus } from "@utils/orderAcceptance";
import { Order, OrderStatus } from "@/types";
import content from "@/content/orders.json";

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

function normalizeOrderPayload(payload: any): Order | null {
  const raw = payload?.order ?? payload?.data ?? payload;
  if (!raw || typeof raw !== "object") return null;
  if (!raw.id && raw._id) {
    return { ...raw, id: raw._id } as Order;
  }
  return raw as Order;
}

/**
 * Encapsulates all logic for the customer orders screen: loading, socket +
 * polling fallback syncing, status filtering, cancel/reorder actions, and the
 * rating/refund modal state.
 */
export const useUserOrders = () => {
  const { orders, isLoading, loadMyOrders, cancelOrder } = useUserApp();
  const [activeFilter, setActiveFilter] = useState<OrderFilterKey>("all");
  const dispatch = useAppDispatch();
  const cartBusinessId = useAppSelector((state) => state.cart.businessId);
  const toast = useToast();
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
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
      loadMyOrders({ silent: true }).catch(() => null);
    }
  }, [loadMyOrders]);

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
        loadMyOrders({ silent: true }).catch(() => null);
      }
      fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
    };

    fallbackTimerRef.current = setTimeout(tick, getFallbackDelayMs());
  }, [getFallbackDelayMs, loadMyOrders, stopFallbackLoop]);

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

  // Fallback path while backend socket events are unavailable: sync only when
  // this screen is focused and socket is disconnected.
  useFocusEffect(
    useCallback(() => {
      refreshFallbackNow();
      startFallbackLoop();

      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          refreshFallbackNow();
        }
      });

      return () => {
        sub.remove();
        stopFallbackLoop();
      };
    }, [refreshFallbackNow, startFallbackLoop, stopFallbackLoop])
  );

  // Auto-rejection is a time-based, server-driven change with no realtime
  // push, so while any order is still pending, poll regardless of socket state.
  const hasPending = useMemo(
    () => orders.some((o) => o.status === OrderStatus.PENDING),
    [orders]
  );
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => {
      loadMyOrders({ silent: true }).catch(() => null);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasPending, loadMyOrders]);

  // Local ticker so a pending order flips to "Rejected" the moment its window
  // lapses on the client clock.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);

  // Real-time: update a single order in Redux when its status changes.
  useSocketEvent<any>("order:updated", (payload) => {
    const updatedOrder = normalizeOrderPayload(payload);
    if (!updatedOrder?.id) return;
    dispatch(updateOrderInStore(updatedOrder));
  });

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

  const handleCancel = useCallback(
    (orderId: string) => {
      Alert.alert(content.alerts.cancelTitle, content.alerts.cancelMessage, [
        { text: content.alerts.cancelNo, style: "cancel" },
        {
          text: content.alerts.cancelYes,
          style: "destructive",
          onPress: () => {
            cancelOrder(orderId)
              .then(() => refreshFallbackNow())
              .catch(() => null);
          },
        },
      ]);
    },
    [cancelOrder, refreshFallbackNow]
  );

  const refresh = useCallback(() => {
    loadMyOrders().catch(() => null);
  }, [loadMyOrders]);

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
    refreshFallbackNow();
  }, [refreshFallbackNow, toast]);

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
  };
};
