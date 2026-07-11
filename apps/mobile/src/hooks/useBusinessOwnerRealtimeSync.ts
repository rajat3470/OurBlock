import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToOrdersByBusiness } from "@services/orderSyncService";
import { setOrders } from "@store/slices/businessOwnerSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { store } from "@store/index";

export function useBusinessOwnerRealtimeSync() {
  const dispatch = useAppDispatch();
  const businessId = useAppSelector((s) => s.businessOwner.businessProfile?.id);

  useEffect(() => {
    if (!businessId) return;
    let initialised = false;
    return subscribeToOrdersByBusiness(businessId, (updated) => {
      if (!initialised) {
        initialised = true;
        if (updated.length === 0 && store.getState().businessOwner.orders.length > 0) return;
      }
      // Skip snapshot if any order in the update has a pending write in flight
      const hasPending = updated.some((o) => hasPendingWrite(o.id));
      if (hasPending) return;
      dispatch(setOrders(updated));
    });
  }, [businessId, dispatch]);
}
