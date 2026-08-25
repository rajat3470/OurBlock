import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { REFUND_WINDOW_HOURS } from "../shared/constants";
import { emitOrderUpdate } from "../lib/socket";

const router = Router();
const VALID_REASONS = ["wrong_item", "missing_item", "quality_issue", "damaged", "other"];

router.get("/my", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const refunds = await prisma.refund.findMany({ where: { userId: req.uid }, orderBy: { createdAt: "desc" }, take: 30 });
    return res.json({ success: true, data: refunds });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { orderId, reason, comment } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: "orderId is required" });
    if (!reason) return res.status(400).json({ success: false, error: "reason is required" });
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, error: `reason must be one of: ${VALID_REASONS.join(", ")}` });
    }
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ success: false, error: "comment must be at least 5 characters" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.userId !== req.uid) return res.status(403).json({ success: false, error: "Not your order" });
    if (order.status !== "delivered") {
      return res.status(400).json({ success: false, error: "Refund requests are only allowed for delivered orders" });
    }

    const hoursElapsed = (Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > REFUND_WINDOW_HOURS) {
      return res.status(400).json({ success: false, error: `Refund window has expired. Requests must be submitted within ${REFUND_WINDOW_HOURS} hours of delivery.` });
    }

    const existing = await prisma.refund.findUnique({ where: { orderId } });
    if (existing) return res.status(409).json({ success: false, error: "A refund request for this order already exists" });

    const refund = await prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId,
          userId: req.uid!,
          businessId: order.businessId,
          businessName: order.businessName ?? "",
          orderAmount: order.finalAmount ?? order.totalAmount ?? 0,
          reason,
          comment: comment.trim(),
          status: "pending",
          refundAmount: 0,
        },
      });
      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: { refundRequested: true } });
      return { refund: created, updatedOrder };
    });

    // Notify business owner of the refund request via socket
    try { emitOrderUpdate(orderId, refund.updatedOrder); } catch {}

    return res.status(201).json({ success: true, data: refund.refund });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
