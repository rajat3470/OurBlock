import { doc, onSnapshot } from "firebase/firestore";
import { Business } from "@/types";
import { serializeFirestoreValue } from "./firestoreSerialize";
import { getFirestoreInstance } from "./firebase";

export type SuspensionCallback = (isSuspended: boolean, business: Business) => void;
export type Unsubscribe = () => void;

/**
 * Subscribes to real-time updates on a single business document and invokes
 * `onChange` whenever the suspension state changes.
 *
 * Used by the business-owner app to detect when the owner's account has been
 * suspended by the blacklist module and trigger an automatic logout.
 */
export function subscribeToBusinessSuspension(
  businessId: string,
  onChange: SuspensionCallback
): Unsubscribe {
  const db = getFirestoreInstance();
  const ref = doc(db, "businesses", businessId);

  let previousSuspendedAt: string | null | undefined = undefined;

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const business = {
        id: snapshot.id,
        ...(serializeFirestoreValue(data) as object),
      } as Business;

      const currentSuspendedAt = business.suspendedAt ?? null;
      const isSuspended =
        currentSuspendedAt !== null &&
        currentSuspendedAt !== undefined &&
        currentSuspendedAt !== "";

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[blacklistSync] business update:",
          businessId,
          "suspended:",
          isSuspended,
          "suspendedAt:",
          currentSuspendedAt
        );
      }

      // Always fire on first snapshot (undefined → any value) and whenever
      // suspendedAt actually changes. Unrelated doc updates are ignored.
      if (previousSuspendedAt !== currentSuspendedAt) {
        previousSuspendedAt = currentSuspendedAt;
        onChange(isSuspended, business);
      }
    },
    (error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[blacklistSync] business suspension snapshot error:", error);
      }
    }
  );
}
