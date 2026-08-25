import { Order } from "@/types";
import { socketService } from "./socketService";

export type OrderSyncCallback = (order: Order) => void;
export type Unsubscribe = () => void;

/**
 * Subscribe to real-time updates for a single order document.
 * Returns an unsubscribe function.
 */
export function subscribeToOrder(orderId: string, onChange: OrderSyncCallback): Unsubscribe {
  const roomKey = `order:${orderId}`;
  socketService.joinRoom(roomKey, "join:order", { orderId });

  const unsubscribe = socketService.on<Order>("order:updated", (order) => {
    if (order.id !== orderId) return;
    onChange(order);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}

/**
 * Subscribe to real-time updates for orders placed by a user.
 * The server emits a single updated Order per event.
 * Returns an unsubscribe function.
 */
export function subscribeToOrdersByUser(
  userId: string,
  onChange: OrderSyncCallback
): Unsubscribe {
  const roomKey = `user-orders:${userId}`;
  socketService.joinRoom(roomKey, "join:user-orders", { userId });

  const unsubscribe = socketService.on<Order>("orders:user:updated", (order) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[orderSync] user order update:", userId, order.id, order.status);
    }
    onChange(order);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}

/**
 * Subscribe to real-time updates for orders placed against a business.
 * The server emits a single updated Order per event.
 * Returns an unsubscribe function.
 */
export function subscribeToOrdersByBusiness(
  businessId: string,
  onChange: OrderSyncCallback
): Unsubscribe {
  const roomKey = `business-orders:${businessId}`;
  socketService.joinRoom(roomKey, "join:business-orders", { businessId });

  const unsubscribe = socketService.on<Order>("orders:business:updated", (order) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[orderSync] business order update:", businessId, order.id, order.status);
    }
    onChange(order);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}

/**
 * Subscribe to orders assigned to a delivery partner (realtime).
 * The server emits a single updated Order per event.
 */
export function subscribeToOrdersByDeliveryPartner(
  partnerId: string,
  onChange: OrderSyncCallback
): Unsubscribe {
  const roomKey = `delivery-orders:${partnerId}`;
  socketService.joinRoom(roomKey, "join:delivery-orders", { partnerId });

  const unsubscribe = socketService.on<Order>("orders:delivery:updated", (order) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[orderSync] delivery partner order update:", partnerId, order.id, order.status);
    }
    onChange(order);
  });

  return () => {
    unsubscribe();
    socketService.leaveRoom(roomKey);
  };
}
