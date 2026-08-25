import { prisma } from "../lib/prisma";
import { notifyCustomer, notifyOwner, notifySystem } from "../lib/notifications";

/**
 * Ported from the Firestore triggers onOrderCreate / onOrderUpdate — invoked
 * inline at the same code point as the corresponding write, since there is
 * no separate trigger runtime in the standalone Node backend.
 */
export async function onOrderCreated(order: any & { items?: any[] }, business: any): Promise<void> {
  const orderRef = order.id.slice(0, 8).toUpperCase();

  const customerTitle = "Order Placed Successfully";
  const customerBody = `Your order #${orderRef} for Rs ${order.finalAmount} has been placed. Waiting for store confirmation.`;
  await notifyCustomer(order.userId, customerTitle, customerBody, { orderId: order.id, status: "pending" });

  if (business.ownerId) {
    const ownerTitle = "🔔 New Order!";
    const itemCount = order.items?.length ?? 0;
    const ownerBody = `Order #${orderRef} from ${order.userName} — Rs ${order.finalAmount} · ${itemCount} item(s). Tap to accept or reject.`;
    await notifyOwner(business.ownerId, ownerTitle, ownerBody, { orderId: order.id, status: "pending", action: "review" });
  }
}

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "Your order has been accepted by the store",
  preparing: "Your order is being processed",
  ready: "Your order is ready for collection/delivery",
  outForDelivery: "Your order is on its way",
  delivered: "Your order has been completed",
  cancelled: "Your order has been cancelled",
  rejected: "Your order has been rejected by the store",
};

export async function onOrderStatusChanged(order: any): Promise<void> {
  const orderRef = order.id.slice(0, 8).toUpperCase();
  let message = STATUS_MESSAGES[order.status] || "Order status updated";
  if (order.status === "rejected" && order.rejectionReason) {
    message = `Your order was rejected: ${order.rejectionReason}`;
  }
  const title = order.status === "rejected" ? "Order Rejected" : "Order Update";
  const body = `Order #${orderRef}: ${message}`;
  await notifyCustomer(order.userId, title, body, {
    orderId: order.id,
    status: order.status,
    ...(order.rejectionReason ? { rejectionReason: order.rejectionReason } : {}),
  });
}

export async function onUserWelcome(userId: string): Promise<void> {
  await notifySystem(userId, "Welcome to mohallaMitr!", "Thank you for joining our community. Start exploring local businesses in your society.");
}
