import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAppSelector } from "@hooks/useRedux";
import { subscribeToOrdersByBusiness } from "@services/orderSyncService";
import {
  deliveryPartnerService,
  DeliveryBusiness,
} from "@services/deliveryPartnerService";
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
 * Realtime delivery queue for the signed-in partner.
 *
 * Listens to the linked shop's orders (same pattern as the business-owner
 * sync) and filters client-side to this partner. That way an assignment
 * write on an existing order triggers an immediate snapshot — more reliable
 * on React Native than waiting for a document to newly match
 * `assignedDeliveryPartnerId == partnerId`.
 */
export function useDeliveryPartnerOrders() {
  const user = useAppSelector((s) => s.auth.user);
  const partnerId = user?.id;

  const [allAssigned, setAllAssigned] = useState<Order[]>([]);
  const [business, setBusiness] = useState<DeliveryBusiness | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyPartnerQueue = useCallback(
    (shopOrders: Order[]) => {
      if (!partnerId) {
        setAllAssigned([]);
        return;
      }
      setAllAssigned(
        shopOrders.filter((o) => o.assignedDeliveryPartnerId === partnerId)
      );
    },
    [partnerId]
  );

  const loadProfile = useCallback(async () => {
    try {
      const res = await deliveryPartnerService.getMe();
      const biz = res.data?.business ?? null;
      setBusiness(biz);
      setBusinessId(biz?.id ?? res.data?.businessId ?? null);
      return biz?.id ?? res.data?.businessId ?? null;
    } catch {
      setBusiness(null);
      setBusinessId(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!partnerId) {
        if (!cancelled) {
          setBusiness(null);
          setBusinessId(null);
          setAllAssigned([]);
          setLoading(false);
        }
        return;
      }
      await loadProfile();
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, loadProfile]);

  useEffect(() => {
    if (!partnerId || !businessId) {
      if (partnerId && !businessId) {
        // Profile still loading — keep spinner until businessId resolves or fails.
        return;
      }
      setAllAssigned([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToOrdersByBusiness(businessId, (shopOrders) => {
      applyPartnerQueue(shopOrders);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [partnerId, businessId, applyPartnerQueue]);

  // Safety net: when the app returns to foreground, re-bind profile in case
  // the long-polling listener stalled (common RN Firestore quirk).
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && partnerId) {
        void loadProfile();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [partnerId, loadProfile]);

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
