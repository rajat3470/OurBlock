import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToBusinessesBySociety } from "@services/businessSyncService";
import { subscribeToOrdersByUser } from "@services/orderSyncService";
import { setBusinesses, setOrders } from "@store/slices/userAppSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { store } from "@store/index";

export function useUserRealtimeSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const selectedSocietyId = useAppSelector((s) => s.userApp.selectedSocietyId);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (!selectedSocietyId) return;
    initialisedRef.current = false;
    return subscribeToBusinessesBySociety(selectedSocietyId, (updated) => {
      if (!initialisedRef.current) {
        initialisedRef.current = true;
        if (updated.length === 0 && store.getState().userApp.businesses.length > 0) return;
      }
      // Merge: keep the Redux version for any business with a pending write,
      // take the Firestore version for everything else.
      const current = store.getState().userApp.businesses;
      const merged = updated.map((b) =>
        hasPendingWrite(b.id) ? (current.find((c) => c.id === b.id) ?? b) : b
      );
      dispatch(setBusinesses(merged));
    });
  }, [selectedSocietyId, dispatch]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToOrdersByUser(userId, (updated) => {
      dispatch(setOrders(updated));
    });
  }, [userId, dispatch]);
}
