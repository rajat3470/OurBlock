import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { resolveImageUpload } from "../lib/storage";
import { notifyCustomer } from "../lib/notifications";
import { isPaymentOutstanding, DELIVERY_QUEUE } from "../shared/constants";
import { emitOrderUpdate } from "../lib/socket";

const router = Router();
const { QUEUE_STATUS_LIST, ACTIONABLE_STATUSES, DELIVERY_QUEUE_LIMIT } = DELIVERY_QUEUE;

async function getDeliveryPartner(uid: string) {
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.role !== "deliveryPartner") return null;
  if (user.status === "suspended" || user.status === "inactive") return null;
  return user;
}

function getBusinessSummaryFromPartner(partner: any) {
  if (partner?.businessName) {
    return {
      id: partner.businessId,
      name: partner.businessName,
      address: partner.businessAddress ?? "",
      phone: partner.businessPhone ?? "",
      imageUrl: partner.businessImageUrl ?? null,
      category: partner.businessCategory ?? null,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /delivery/orders — active deliveries for the partner's linked shop
// ---------------------------------------------------------------------------
router.get("/orders", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const partner = await getDeliveryPartner(req.uid!);
    if (!partner) return res.status(403).json({ success: false, error: "Delivery partner access required" });
    if (!partner.businessId) return res.status(400).json({ success: false, error: "This delivery partner is not linked to a shop" });

    const orders = await prisma.order.findMany({
      where: { businessId: partner.businessId, status: { in: [...QUEUE_STATUS_LIST] } },
      orderBy: { createdAt: "desc" },
      take: DELIVERY_QUEUE_LIMIT,
      include: { items: true },
    });

    const filtered = orders.filter((o) => o.assignedDeliveryPartnerId === partner.id);
    const business = getBusinessSummaryFromPartner(partner);

    return res.json({
      success: true,
      data: filtered,
      business,
      meta: {
        actionableCount: filtered.filter((o) => ACTIONABLE_STATUSES.has(o.status)).length,
        total: filtered.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/orders/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const partner = await getDeliveryPartner(req.uid!);
    if (!partner) return res.status(403).json({ success: false, error: "Delivery partner access required" });

    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== partner.businessId) return res.status(403).json({ success: false, error: "Access denied" });
    if (order.assignedDeliveryPartnerId && order.assignedDeliveryPartnerId !== partner.id) {
      return res.status(403).json({ success: false, error: "This order is assigned to another partner" });
    }
    if (!order.assignedDeliveryPartnerId) {
      return res.status(403).json({ success: false, error: "This order has not been assigned to you yet" });
    }

    return res.json({ success: true, data: order });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/orders/:id/start", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const partner = await getDeliveryPartner(req.uid!);
    if (!partner) return res.status(403).json({ success: false, error: "Delivery partner access required" });

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== partner.businessId) return res.status(403).json({ success: false, error: "Access denied" });
    if (order.assignedDeliveryPartnerId !== partner.id) return res.status(403).json({ success: false, error: "This order is not assigned to you" });
    if (order.status !== "ready" && order.status !== "outForDelivery") {
      return res.status(400).json({ success: false, error: "Wait until the shop marks this order as Ready" });
    }

    let updated = order;
    if (order.status === "ready") {
      const trackingUpdate = { status: "outForDelivery", timestamp: new Date().toISOString(), notes: `Out for delivery by ${partner.firstName ?? "partner"}` };
      updated = await prisma.order.update({
        where: { id: order.id },
        data: { status: "outForDelivery", trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate] },
      });
      notifyCustomer(order.userId, "🚚 Out for Delivery", `${order.businessName || "Your order"} is on its way to you!`).catch(() => undefined);
      try { emitOrderUpdate(updated.id ?? order.id, updated); } catch {}
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/orders/:id/complete", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const partner = await getDeliveryPartner(req.uid!);
    if (!partner) return res.status(403).json({ success: false, error: "Delivery partner access required" });

    const { deliveryProofImageUrl, paymentCollectedMethod } = req.body ?? {};
    if (!deliveryProofImageUrl || typeof deliveryProofImageUrl !== "string") {
      return res.status(400).json({ success: false, error: "deliveryProofImageUrl is required" });
    }

    let storedProofUrl: string;
    try {
      storedProofUrl = await resolveImageUpload(`deliveryProofs/${partner.id}`, deliveryProofImageUrl);
    } catch (proofErr: any) {
      return res.status(400).json({ success: false, error: proofErr?.message || "Invalid delivery proof image" });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== partner.businessId) return res.status(403).json({ success: false, error: "Access denied" });
    if (order.assignedDeliveryPartnerId !== partner.id) return res.status(403).json({ success: false, error: "This order is not assigned to you" });
    if (!ACTIONABLE_STATUSES.has(order.status)) {
      return res.status(400).json({ success: false, error: "Order is not ready for delivery completion yet" });
    }

    const outstanding = isPaymentOutstanding(order.paymentStatus);
    if (outstanding) {
      if (!paymentCollectedMethod || !["cash", "upi", "card", "wallet"].includes(paymentCollectedMethod)) {
        return res.status(400).json({ success: false, error: "paymentCollectedMethod is required (cash, upi, or card) when payment is still pending" });
      }
    }

    const trackingUpdate = {
      status: "delivered",
      timestamp: new Date().toISOString(),
      notes: outstanding ? `Delivered & payment collected via ${paymentCollectedMethod}` : "Delivered (payment already completed)",
    };

    const updateData: Record<string, any> = {
      status: "delivered",
      deliveredAt: new Date(),
      deliveredBy: req.uid,
      deliveryProofImageUrl: storedProofUrl,
      trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate],
    };

    if (outstanding) {
      updateData.paymentStatus = "completed";
      updateData.paymentCollectedAt = new Date();
      updateData.paymentCollectedBy = req.uid;
      updateData.paymentCollectedMethod = paymentCollectedMethod;
      updateData.paymentMethod = paymentCollectedMethod;
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data: updateData });
    notifyCustomer(order.userId, "✅ Order Delivered", `${order.businessName || "Your order"} has been delivered. Enjoy!`).catch(() => undefined);
    try { emitOrderUpdate(updated.id ?? order.id, updated); } catch {}

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const partner = await getDeliveryPartner(req.uid!);
    if (!partner) return res.status(403).json({ success: false, error: "Delivery partner access required" });
    const { passwordHash, ...safe } = partner;
    const business = getBusinessSummaryFromPartner(partner);
    return res.json({ success: true, data: { ...safe, business } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
