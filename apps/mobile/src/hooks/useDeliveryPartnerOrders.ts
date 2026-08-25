import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAppSelector } from "@hooks/useRedux";
import { subscribeToOrdersByDeliveryPartner } from "@services/orderSyncService";
import {
  deliveryPartnerService,
  DeliveryBusiness,
} from "@services/deliveryPartnerService";
import { hasPendingWrite } from "@services/pendingWrites";
import { Order, OrderStatus } from "@/types";

const QUEUE_STATUSES = new Set<OrderStatus | string>([
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

const ACTIONABLE_STATUSES = new Set<OrderStatus | string>([
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

/**
 * Delivery queue for the signed-in partner.
 *
 * Seeds orders via HTTP on mount and re-fetches on tab focus, so the UI is
 * never blank regardless of socket state. Socket events provide incremental
 * updates between full loads.
 */
export function useDeliveryPartnerOrders() {
  const user = useAppSelector((s) => s.auth.user);
  const partnerId = user?.id;

  const [allAssigned, setAllAssigned] = useState<Order[]>([]);
  const [business, setBusiness] = useState<DeliveryBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await deliveryPartnerService.getMe();
      const biz = res.data?.business ?? null;
      setBusiness(biz);
      return biz?.id ?? res.data?.businessId ?? null;
    } catch {
      setBusiness(null);
      return null;
    }
  }, []);

  /** Fetch orders from the HTTP API. Always resolves loading state. */
  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      setError(null);
      try {
        const res = await deliveryPartnerService.getPendingOrders();
        setAllAssigned(res.data ?? []);
        if (res.business) setBusiness(res.business);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load deliveries";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load: fetch profile + orders via HTTP
  useEffect(() => {
    if (!partnerId) {
      setBusiness(null);
      setAllAssigned([]);
      setLoading(false);
      return;
    }
    Promise.all([loadProfile(), loadOrders()]).catch(() => {});
  }, [partnerId, loadProfile, loadOrders]);

  // Silently refresh orders when the tab gains focus
  useFocusEffect(
    useCallback(() => {
      if (partnerId) loadOrders({ silent: true }).catch(() => {});
    }, [partnerId, loadOrders])
  );

  // Subscribe to real-time incremental updates via socket
  useEffect(() => {
    if (!partnerId) return;

    const unsubscribe = subscribeToOrdersByDeliveryPartner(partnerId, (order) => {
      if (hasPendingWrite(order.id)) return;
      setAllAssigned((prev) => {
        // Upsert if still assigned to this partner, otherwise remove
        if (order.assignedDeliveryPartnerId === partnerId) {
          const idx = prev.findIndex((o) => o.id === order.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = order;
            return next;
          }
          return [order, ...prev];
        }
        return prev.filter((o) => o.id !== order.id);
      });
    });

    return unsubscribe;
  }, [partnerId]);

  // Refresh profile + orders when app returns to foreground
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && partnerId) {
        loadProfile().catch(() => {});
        loadOrders({ silent: true }).catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [partnerId, loadProfile, loadOrders]);

  const orders = useMemo(
    () => allAssigned.filter((o) => QUEUE_STATUSES.has(o.status)),
    [allAssigned]
  );

  const actionableCount = useMemo(
    () => orders.filter((o) => ACTIONABLE_STATUSES.has(o.status)).length,
    [orders]
  );

  const refreshBusiness = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return {
    orders,
    business,
    actionableCount,
    loading,
    error,
    refreshBusiness,
  };
}
