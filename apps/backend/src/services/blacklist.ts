import { Business, User } from "../models";
import { BLACKLIST_REJECTION_LIMIT, BLACKLIST_WINDOW_MS } from "../shared/constants";

function filterWithinWindow(timestamps: string[], windowMs: number): string[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((ts) => new Date(ts).getTime() >= cutoff);
}

/**
 * Evaluates whether an order rejection should trigger an owner suspension:
 * 5 rejections of the SAME customer within a 1-hour rolling window. Runs in
 * a MongoDB session transaction to avoid races, mirroring the Firestore
 * transaction in the legacy owner.ts `evaluateBlacklistRejection`.
 */
export async function evaluateBlacklistRejection(
  businessId: string,
  customerId: string,
  ownerUid: string
): Promise<{ shouldSuspend: boolean }> {
  return Business.db.transaction(async (session) => {
    const business = await Business.findById(businessId).session(session).lean();
    if (!business || business.suspendedAt) return { shouldSuspend: false };

    const allRejections: Record<string, string[]> = business.recentRejections ?? {};
    const userTimestamps = allRejections[customerId] ?? [];
    const withinWindow = filterWithinWindow(userTimestamps, BLACKLIST_WINDOW_MS);
    withinWindow.push(new Date().toISOString());

    const updatedRejections = { ...allRejections, [customerId]: withinWindow };
    const shouldSuspend = withinWindow.length >= BLACKLIST_REJECTION_LIMIT;

    if (shouldSuspend) {
      const suspensionReason =
        `Auto-suspended: rejected ${BLACKLIST_REJECTION_LIMIT} consecutive orders ` +
        `from the same user within 1 hour. Contact admin to unblock your account.`;

      await Business.findByIdAndUpdate(
        businessId,
        {
          recentRejections: updatedRejections,
          status: "suspended",
          suspendedAt: new Date(),
          suspensionReason,
          isTakingOrders: false,
        },
        { session }
      );
      await User.findByIdAndUpdate(ownerUid, { status: "suspended" }, { session });
    } else {
      await Business.findByIdAndUpdate(businessId, { recentRejections: updatedRejections }, { session });
    }

    return { shouldSuspend };
  });
}
