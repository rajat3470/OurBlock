import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToOrdersByBusiness } from "@services/orderSyncService";
import { setBusinessProfile, setOrders, setProducts, upsertOrder } from "@store/slices/businessOwnerSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { businessOwnerService } from "@services/businessOwnerService";
import { subscribeToBusiness, subscribeToBusinessProducts } from "@services/businessSyncService";
import { socketService } from "@services/socketService";

const REFRESH_MIN_INTERVAL_MS = 30_000;

export function useBusinessOwnerRealtimeSync() {
  const dispatch = useAppDispatch();
  const businessId = useAppSelector((s) => s.businessOwner.businessProfile?.id);
  const lastFullFetchRef = useRef(0);

  useEffect(() => {
    if (!businessId) return;
    return subscribeToOrdersByBusiness(businessId, (order) => {
      if (hasPendingWrite(order.id)) return;
      dispatch(upsertOrder(order));
    });
  }, [businessId, dispatch]);

  useEffect(() => {
    if (!businessId) return;

    const refreshBusinessData = () => {
      const now = Date.now();
      if (now - lastFullFetchRef.current < REFRESH_MIN_INTERVAL_MS) return;
      lastFullFetchRef.current = now;

      Promise.all([
        businessOwnerService.getMyBusiness().then((business) => dispatch(setBusinessProfile(business))),
        businessOwnerService.getMyProducts().then((response) => dispatch(setProducts(response.data))),
        businessOwnerService.getMyOrders().then((response) => dispatch(setOrders(response.data))),
      ]).catch(() => {});
    };

    const unsubscribeBusiness = subscribeToBusiness(businessId, (business) => {
      if (hasPendingWrite(business.id)) return;
      dispatch(setBusinessProfile(business));
    });
    const unsubscribeProducts = subscribeToBusinessProducts(businessId, () => {
      businessOwnerService
        .getMyProducts()
        .then((response) => dispatch(setProducts(response.data)))
        .catch(() => {});
    });
    const unsubscribeReconnect = socketService.on("connect", refreshBusinessData);

    return () => {
      unsubscribeReconnect();
      unsubscribeProducts();
      unsubscribeBusiness();
    };
  }, [businessId, dispatch]);

  return { lastFullFetchRef };
}
