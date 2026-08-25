import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { autoRejectIfExpired } from "../services/orderExpiry";

/**
 * Ported from apps/firebase/functions/src/triggers/autoRejectOrders.ts —
 * safety-net sweeper enforcing the 60s order-acceptance window server-side.
 * Runs every minute via node-cron instead of a Pub/Sub scheduled function.
 */
export function startAutoRejectOrdersJob(): void {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const candidates = await prisma.order.findMany({
        where: { status: "pending", autoRejectAt: { lte: now } },
        take: 300,
      });

      if (candidates.length === 0) return;

      let rejected = 0;
      for (const order of candidates) {
        const { rejected: didReject } = await autoRejectIfExpired(order);
        if (didReject) rejected++;
      }

      console.log(`autoRejectExpiredOrders: auto-rejected ${rejected}/${candidates.length} expired order(s)`);
    } catch (err) {
      console.error("autoRejectExpiredOrders job failed", err);
    }
  });
}
