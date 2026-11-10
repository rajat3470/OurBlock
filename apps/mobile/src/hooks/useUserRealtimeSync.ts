import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToBusinessesBySociety } from "@services/businessSyncService";
import { subscribeToOrdersByUser } from "@services/orderSyncService";
import { upsertOrder, upsertBusiness, setBusinesses } from "@store/slices/userAppSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { socketService } from "@services/socketService";
import { userAppService } from "@services/userAppService";

const REFRESH_MIN_INTERVAL_MS = 30_000;

export function useUserRealtimeSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const selectedSocietyId = useAppSelector((s) => s.userApp.selectedSocietyId);
  const lastBusinessFetchRef = useRef(0);

  // ── Socket real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!selectedSocietyId) return;
    return subscribeToBusinessesBySociety(selectedSocietyId, (business) => {
      if (hasPendingWrite(business.id)) return;
      dispatch(upsertBusiness(business));
    });
  }, [selectedSocietyId, dispatch]);

  // ── Re-fetch on socket (re)connect — with stale guard ────────────────
  useEffect(() => {
    if (!selectedSocietyId) return;
    const unsubscribe = socketService.on("connect", () => {
      const now = Date.now();
      if (now - lastBusinessFetchRef.current < REFRESH_MIN_INTERVAL_MS) return;
      lastBusinessFetchRef.current = now;
      userAppService
        .getBusinessesBySociety(selectedSocietyId)
        .then((businesses) => dispatch(setBusinesses(businesses)))
        .catch(() => {});
    });
    return unsubscribe;
  }, [selectedSocietyId, dispatch]);

  // ── Order subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    return subscribeToOrdersByUser(userId, (order) => {
      dispatch(upsertOrder(order));
    });
  }, [userId, dispatch]);

  /** Expose the ref so other hooks can mark a fetch as recent. */
  return { lastBusinessFetchRef };
}
