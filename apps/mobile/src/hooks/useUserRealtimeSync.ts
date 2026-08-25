import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToBusinessesBySociety } from "@services/businessSyncService";
import { subscribeToOrdersByUser } from "@services/orderSyncService";
import { upsertOrder, upsertBusiness } from "@store/slices/userAppSlice";
import { hasPendingWrite } from "@services/pendingWrites";

export function useUserRealtimeSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const selectedSocietyId = useAppSelector((s) => s.userApp.selectedSocietyId);

  useEffect(() => {
    if (!selectedSocietyId) return;
    return subscribeToBusinessesBySociety(selectedSocietyId, (business) => {
      // Skip socket update if there is a pending write in flight for this business
      if (hasPendingWrite(business.id)) return;
      dispatch(upsertBusiness(business));
    });
  }, [selectedSocietyId, dispatch]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToOrdersByUser(userId, (order) => {
      dispatch(upsertOrder(order));
    });
  }, [userId, dispatch]);
}
