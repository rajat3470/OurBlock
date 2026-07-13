import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {autoRejectIfExpired} from "../shared/orderExpiry";

const db = admin.firestore();

/**
 * autoRejectExpiredOrders
 *
 * Safety-net sweeper that enforces the order acceptance window server-side.
 * Every minute it finds orders still `pending` past their `autoRejectAt`
 * deadline and rejects them (via the shared, transactional
 * `autoRejectIfExpired` helper). The customer notification is emitted by the
 * existing `onOrderUpdate` trigger when the status flips pending -> rejected.
 *
 * This is a backstop: order read paths also apply the same lazy expiration, so
 * a customer/owner viewing an order past its deadline sees the rejected state
 * immediately rather than waiting up to a minute for this cron. Orders nobody
 * is actively viewing still get rejected (and notified) here.
 *
 * Edge cases:
 * - Only orders carrying `autoRejectAt` are ever touched, so legacy pending
 *   orders created before this feature are never mass-rejected.
 * - The rejection transaction re-checks status + deadline, so it is idempotent
 *   and cannot race an owner accepting at the last second.
 */
export const autoRejectExpiredOrders = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("orders")
      .where("status", "==", "pending")
      .where("autoRejectAt", "<=", now)
      .limit(300)
      .get();

    if (snapshot.empty) {
      return null;
    }

    let rejected = 0;

    for (const doc of snapshot.docs) {
      const {rejected: didReject} = await autoRejectIfExpired(db, doc.ref, doc.data());
      if (didReject) rejected++;
    }

    console.log(`autoRejectExpiredOrders: auto-rejected ${rejected}/${snapshot.size} expired order(s)`);
    return null;
  });
