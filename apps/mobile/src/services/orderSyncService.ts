import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import { Order } from "@/types";
import { serializeFirestoreValue } from "./firestoreSerialize";
import { getFirestoreInstance } from "./firebase";

export type OrderSyncCallback = (order: Order) => void;
export type OrdersSyncCallback = (orders: Order[]) => void;
export type Unsubscribe = () => void;

function mapDoc(snapshot: DocumentSnapshot): Order | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...(serializeFirestoreValue(data) as object) } as Order;
}

function mapCollection(snapshot: QuerySnapshot): Order[] {
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...(serializeFirestoreValue(d.data()) as object) }) as Order
  );
}

function sortByCreatedAtDesc(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const aMs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bMs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bMs - aMs;
  });
}

/**
 * Subscribe to real-time updates for a single order document.
 * Returns an unsubscribe function.
 */
export function subscribeToOrder(orderId: string, onChange: OrderSyncCallback): Unsubscribe {
  const db = getFirestoreInstance();
  const ref = doc(db, "orders", orderId);

  return onSnapshot(
    ref,
    (snapshot) => {
      const order = mapDoc(snapshot);
      if (order) {
        if (process.env.NODE_ENV === "development") {
          console.log("[orderSync] single order update:", order.id, order.status);
        }
        onChange(order);
      }
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[orderSync] single order snapshot error:", error);
      }
    }
  );
}

/**
 * Subscribe to real-time updates for all orders placed by a user.
 * Returns an unsubscribe function.
 */
export function subscribeToOrdersByUser(
  userId: string,
  onChange: OrdersSyncCallback
): Unsubscribe {
  const db = getFirestoreInstance();
  const q = query(collection(db, "orders"), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = sortByCreatedAtDesc(mapCollection(snapshot));
      if (process.env.NODE_ENV === "development") {
        console.log("[orderSync] user orders update:", userId, orders.length, orders.map((o) => o.id));
      }
      onChange(orders);
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[orderSync] user orders snapshot error:", error);
      }
    }
  );
}

/**
 * Subscribe to real-time updates for all orders placed against a business.
 * Returns an unsubscribe function.
 */
export function subscribeToOrdersByBusiness(
  businessId: string,
  onChange: OrdersSyncCallback
): Unsubscribe {
  const db = getFirestoreInstance();
  const q = query(collection(db, "orders"), where("businessId", "==", businessId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = sortByCreatedAtDesc(mapCollection(snapshot));
      if (process.env.NODE_ENV === "development") {
        console.log("[orderSync] business orders update:", businessId, orders.length, orders.map((o) => o.id));
      }
      onChange(orders);
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[orderSync] business orders snapshot error:", error);
      }
    }
  );
}
