import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "@hooks/useRedux";
import { subscribeToBusinessesBySociety } from "@services/businessSyncService";
import { subscribeToOrdersByUser } from "@services/orderSyncService";
import { upsertOrder, upsertBusiness, setBusinesses } from "@store/slices/userAppSlice";
import { hasPendingWrite } from "@services/pendingWrites";
import { socketService } from "@services/socketService";
import { userAppService } from "@services/userAppService";

function fetchBusinesses(societyId: string, dispatch: ReturnType<typeof useAppDispatch>) {
  userAppService
    .getBusinessesBySociety(societyId)
    .then((businesses) => {
      console.log("[realtimeSync] fetched businesses:", businesses.length);
      dispatch(setBusinesses(businesses));
    })
    .catch((err) => {
      console.warn("[realtimeSync] fetchBusinesses failed:", err?.message);
    });
}

export function useUserRealtimeSync() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const selectedSocietyId = useAppSelector((s) => s.userApp.selectedSocietyId);

  // ── Socket real-time subscription ─────────────────────────────────────
  useEffect(() => {
    if (!selectedSocietyId) return;
    console.log("[realtimeSync] subscribing to society:", selectedSocietyId);
    return subscribeToBusinessesBySociety(selectedSocietyId, (business) => {
      if (hasPendingWrite(business.id)) {
        console.log("[realtimeSync] skipping (pending write):", business.id);
        return;
      }
      console.log("[realtimeSync] dispatching upsertBusiness:", business.id, "isTakingOrders:", business.isTakingOrders);
      dispatch(upsertBusiness(business));
    });
  }, [selectedSocietyId, dispatch]);

  // ── Re-fetch on socket (re)connect ────────────────────────────────────
  useEffect(() => {
    if (!selectedSocietyId) return;
    const unsubscribe = socketService.on("connect", () => {
      console.log("[realtimeSync] socket connected, re-fetching businesses");
      fetchBusinesses(selectedSocietyId, dispatch);
    });
    return unsubscribe;
  }, [selectedSocietyId, dispatch]);

  // ── Refresh when app returns from background ──────────────────────────
  useEffect(() => {
    if (!selectedSocietyId) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        console.log("[realtimeSync] app foregrounded, re-fetching businesses");
        fetchBusinesses(selectedSocietyId, dispatch);
      }
    });
    return () => sub.remove();
  }, [selectedSocietyId, dispatch]);

  // ── Order subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    return subscribeToOrdersByUser(userId, (order) => {
      dispatch(upsertOrder(order));
    });
  }, [userId, dispatch]);
}
