import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import { Business } from "@/types";
import { serializeFirestoreValue } from "./firestoreSerialize";
import { getFirestoreInstance } from "./firebase";

export type BusinessSyncCallback = (business: Business) => void;
export type BusinessesSyncCallback = (businesses: Business[]) => void;
export type Unsubscribe = () => void;

function mapDoc(snapshot: DocumentSnapshot): Business | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...(serializeFirestoreValue(data) as object) } as Business;
}

function mapCollection(snapshot: QuerySnapshot): Business[] {
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...(serializeFirestoreValue(d.data()) as object) }) as Business
  );
}

/**
 * Subscribe to real-time updates for a single business document.
 * Returns an unsubscribe function.
 */
export function subscribeToBusiness(
  businessId: string,
  onChange: BusinessSyncCallback
): Unsubscribe {
  const db = getFirestoreInstance();
  const ref = doc(db, "businesses", businessId);

  return onSnapshot(
    ref,
    (snapshot) => {
      const business = mapDoc(snapshot);
      if (business) {
        if (process.env.NODE_ENV === "development") {
          console.log("[businessSync] single business update:", business.id, business.status, business.isTakingOrders);
        }
        onChange(business);
      }
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[businessSync] single business snapshot error:", error);
      }
    }
  );
}

/**
 * Subscribe to real-time updates for all businesses in a society.
 * Returns an unsubscribe function.
 */
export function subscribeToBusinessesBySociety(
  societyId: string,
  onChange: BusinessesSyncCallback
): Unsubscribe {
  const db = getFirestoreInstance();
  const q = query(collection(db, "businesses"), where("societyId", "==", societyId));

  return onSnapshot(
    q,
    (snapshot) => {
      const businesses = mapCollection(snapshot);
      if (process.env.NODE_ENV === "development") {
        console.log("[businessSync] society businesses update:", societyId, businesses.length, businesses.map((b) => b.id));
      }
      onChange(businesses);
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[businessSync] society businesses snapshot error:", error);
      }
    }
  );
}
