import { Order, Product } from "../models";
import { ORDER_AUTO_REJECT_REASON } from "../shared/constants";
import { emitOrderUpdate } from "../lib/socket";
import { onOrderStatusChanged } from "./orderEvents";

/** True when an order is still pending and past its acceptance deadline. */
export function isExpiredPending(order: { status?: string; autoRejectAt?: Date | null }): boolean {
  if (order.status !== "pending" || !order.autoRejectAt) return false;
  return Date.now() > order.autoRejectAt.getTime();
}

/**
 * Restore stock for each item in a rejected/cancelled order.
 * Must be called inside a Mongoose transaction session.
 */
async function restoreInventory(items: any[], session: any): Promise<void> {
  for (const item of items) {
    if (!item.productId || !item.quantity) continue;
    const product = await Product.findById(item.productId).session(session);
    if (!product) continue;
    product.stock = (Number(product.stock ?? 0)) + Number(item.quantity);
    await product.save({ session });
  }
}

/**
 * Auto-reject an order if (and only if) it is still `pending` past its
 * `autoRejectAt` deadline. Uses a MongoDB session transaction with a re-check
 * to stay idempotent and race-safe against concurrent acceptance attempts.
 *
 * Also restores inventory for items in the rejected order and emits
 * socket + push notifications so all clients update in real-time.
 */
export async function autoRejectIfExpired(order: any): Promise<{ order: any; rejected: boolean }> {
  if (!isExpiredPending(order)) return { order, rejected: false };

  try {
    const result = await Order.db.transaction(async (session) => {
      const fresh = await Order.findById(order.id).session(session).lean();
      if (!fresh || !isExpiredPending(fresh)) return null;

      const trackingUpdate = {
        status: "rejected",
        timestamp: new Date().toISOString(),
        rejectionReason: ORDER_AUTO_REJECT_REASON,
        rejectedBy: "system",
        notes: ORDER_AUTO_REJECT_REASON,
      };

      await Order.findByIdAndUpdate(
        order.id,
        {
          status: "rejected",
          rejectionReason: ORDER_AUTO_REJECT_REASON,
          rejectedBy: "system",
          rejectedAt: new Date(),
          $push: { trackingUpdates: trackingUpdate },
        },
        { session }
      );

      // Restore inventory for the rejected order
      if (Array.isArray(fresh.items) && fresh.items.length > 0) {
        await restoreInventory(fresh.items, session);
      }

      return Order.findById(order.id).session(session).lean();
    });

    if (!result) {
      const latest = await Order.findById(order.id).lean();
      return { order: latest ?? order, rejected: false };
    }

    // Fire-and-forget socket + push notifications after successful commit
    const orderId = (result as any)._id?.toString() ?? (result as any).id;
    try { emitOrderUpdate(orderId, result); } catch {}
    onOrderStatusChanged(result).catch((err) => console.error("onOrderStatusChanged (auto-reject) failed", err));

    return { order: result, rejected: true };
  } catch (err) {
    console.error("autoRejectIfExpired failed for order", order.id, err);
    return { order, rejected: false };
  }
}

/** Applies lazy expiry to a page of orders (used by all order-listing endpoints). */
export async function expirePendingOrders(orders: any[]): Promise<any[]> {
  return Promise.all(
    orders.map(async (order) => {
      if (!isExpiredPending(order)) return order;
      const { order: effective } = await autoRejectIfExpired(order);
      return effective;
    })
  );
}
