import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToOrdersByBusiness } from "@services/orderSyncService";
import { setOrders, upsertOrder } from "@store/slices/businessOwnerSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { businessOwnerService } from "@services/businessOwnerService";

export function useBusinessOwnerRealtimeSync() {
  const dispatch = useAppDispatch();
  const businessId = useAppSelector((s) => s.businessOwner.businessProfile?.id);

  // Seed orders via HTTP when the business profile is first available.
  // This ensures the order list is populated regardless of socket state.
  useEffect(() => {
    if (!businessId) return;
    businessOwnerService
      .getMyOrders()
      .then((res) => dispatch(setOrders(res.data)))
      .catch(() => {});
  }, [businessId, dispatch]);

  // Subscribe to real-time incremental updates via socket.
  useEffect(() => {
    if (!businessId) return;
    return subscribeToOrdersByBusiness(businessId, (order) => {
      // Skip socket update if there is a pending write in flight for this order
      if (hasPendingWrite(order.id)) return;
      dispatch(upsertOrder(order));
    });
  }, [businessId, dispatch]);
}
