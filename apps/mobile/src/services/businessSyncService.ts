import { Business } from "@/types";
import { socketService } from "./socketService";

export type BusinessSyncCallback = (business: Business) => void;
export type Unsubscribe = () => void;

/**
 * Subscribe to real-time updates for a single business document.
 * Returns an unsubscribe function.
 */
export function subscribeToBusiness(
  businessId: string,
  onChange: BusinessSyncCallback
): Unsubscribe {
  const roomKey = `business:${businessId}`;
  socketService.joinRoom(roomKey, "join:business", { businessId });

  const unsubscribe = socketService.on<Business>("business:updated", (business) => {
    if (business.id !== businessId) return;
    onChange(business);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}

/**
 * Subscribe to real-time updates for businesses in a society.
 * The server emits a single updated Business per event.
 * Returns an unsubscribe function.
 */
export function subscribeToBusinessesBySociety(
  societyId: string,
  onChange: BusinessSyncCallback
): Unsubscribe {
  const roomKey = `society:${societyId}`;
  socketService.joinRoom(roomKey, "join:society", { societyId });

  const unsubscribe = socketService.on<Business>("businesses:society:updated", (business) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[businessSync] society business update:", societyId, business.id);
    }
    onChange(business);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}
