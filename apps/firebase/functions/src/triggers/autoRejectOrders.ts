import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ORDER_AUTO_REJECT_REASON } from '../shared/constants';

const db = admin.firestore();

/**
 * autoRejectExpiredOrders
 *
 * Safety-net sweeper that enforces the order acceptance window server-side.
 * Every minute it finds orders that are still `pending` past their
 * `autoRejectAt` deadline and rejects them with a system reason. The customer
 * notification is emitted by the existing `onOrderUpdate` trigger when the
 * status flips pending -> rejected.
 *
 * Design notes / edge cases handled:
 * - Only orders that carry an `autoRejectAt` field are ever touched, so legacy
 *   pending orders created before this feature are never mass-rejected.
 * - Each rejection runs in a transaction that re-checks `status === 'pending'`
 *   and the deadline, so it is idempotent and cannot race with an owner
 *   accepting the order at the last second (whichever transaction commits
 *   first wins; the other becomes a no-op).
 * - Firebase's minimum schedule granularity is 1 minute, so enforcement fires
 *   within ~1-2 minutes of the 60s deadline; the mobile UI shows the exact
 *   countdown.
 */
export const autoRejectExpiredOrders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection('orders')
      .where('status', '==', 'pending')
      .where('autoRejectAt', '<=', now)
      .limit(300)
      .get();

    if (snapshot.empty) {
      return null;
    }

    let rejected = 0;

    for (const doc of snapshot.docs) {
      try {
        const didReject = await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          const data = fresh.data();
          if (!data || data.status !== 'pending') return false;

          const deadlineMs = data.autoRejectAt?.toMillis?.();
          if (deadlineMs === undefined || Date.now() <= deadlineMs) return false;

          const trackingUpdate = {
            status: 'rejected',
            timestamp: new Date().toISOString(),
            rejectionReason: ORDER_AUTO_REJECT_REASON,
            rejectedBy: 'system',
            notes: ORDER_AUTO_REJECT_REASON,
          };

          tx.update(doc.ref, {
            status: 'rejected',
            rejectionReason: ORDER_AUTO_REJECT_REASON,
            rejectedBy: 'system',
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return true;
        });

        if (didReject) rejected++;
      } catch (err) {
        console.error('autoRejectExpiredOrders: failed for order', doc.id, err);
      }
    }

    console.log(`autoRejectExpiredOrders: auto-rejected ${rejected}/${snapshot.size} expired order(s)`);
    return null;
  });
