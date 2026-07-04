import * as admin from 'firebase-admin';
import { ORDER_AUTO_REJECT_REASON } from './constants';

type Db = admin.firestore.Firestore;
type DocRef = admin.firestore.DocumentReference;
type DocData = admin.firestore.DocumentData;

/** True when an order doc is still pending and past its acceptance deadline. */
export function isExpiredPending(data: DocData | undefined): boolean {
  if (!data || data.status !== 'pending') return false;
  const deadlineMs = data.autoRejectAt?.toMillis?.();
  return deadlineMs !== undefined && Date.now() > deadlineMs;
}

/**
 * Auto-reject an order if (and only if) it is still `pending` past its
 * `autoRejectAt` deadline. The write happens inside a transaction that
 * re-checks both conditions, so it is idempotent and safe to call
 * concurrently from:
 *   - the scheduled sweeper (backstop / notifications for idle orders), and
 *   - order read paths ("lazy expiration"), which guarantees a client that
 *     fetches after the deadline immediately sees the rejected state even
 *     before the 1-minute cron has run.
 *
 * Returns the effective order data (rejected fields resolved via a re-read
 * when a rejection occurred) and whether this call performed the rejection.
 */
export async function autoRejectIfExpired(
  db: Db,
  ref: DocRef,
  data: DocData
): Promise<{ data: DocData; rejected: boolean }> {
  if (!isExpiredPending(data)) return { data, rejected: false };

  try {
    const didReject = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const cur = fresh.data();
      if (!isExpiredPending(cur)) return false;

      const trackingUpdate = {
        status: 'rejected',
        timestamp: new Date().toISOString(),
        rejectionReason: ORDER_AUTO_REJECT_REASON,
        rejectedBy: 'system',
        notes: ORDER_AUTO_REJECT_REASON,
      };

      tx.update(ref, {
        status: 'rejected',
        rejectionReason: ORDER_AUTO_REJECT_REASON,
        rejectedBy: 'system',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (!didReject) {
      // Someone else won the race — return the freshest data we can.
      const latest = await ref.get();
      return { data: latest.data() ?? data, rejected: false };
    }

    const updated = await ref.get();
    return { data: updated.data() ?? data, rejected: true };
  } catch (err) {
    console.error('autoRejectIfExpired failed for order', ref.id, err);
    return { data, rejected: false };
  }
}
