import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { ORDER_FEES, ORDER_ACCEPTANCE_WINDOW_SECONDS, isPaymentOutstanding } from "../shared/constants";
import { autoRejectIfExpired, isExpiredPending, expirePendingOrders } from "../services/orderExpiry";
import { computeCouponDiscount } from "../services/coupons";
import { notifyCustomer } from "../lib/notifications";
import { onOrderCreated, onOrderStatusChanged } from "../services/orderEvents";
import { emitOrderUpdate } from "../lib/socket";

const router = Router();
const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

const STATUS_MESSAGES: Record<string, { title: string; body: (n?: string) => string }> = {
  confirmed: { title: "✅ Order Confirmed", body: (n) => `${n || "Your order"} has been confirmed and is being prepared.` },
  preparing: { title: "👨‍🍳 Being Prepared", body: (n) => `${n || "Your order"} is now being prepared.` },
  ready: { title: "🎉 Ready for Pickup", body: (n) => `${n || "Your order"} is ready! Delivery is on the way.` },
  outForDelivery: { title: "🚚 Out for Delivery", body: (n) => `${n || "Your order"} is on its way to you!` },
  delivered: { title: "✅ Order Delivered", body: (n) => `${n || "Your order"} has been delivered. Enjoy your order!` },
  cancelled: { title: "❌ Order Cancelled", body: (n) => `${n || "Your order"} has been cancelled.` },
};

async function notifyOrderStatusChange(userId: string, status: string, orderNote?: string) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  await notifyCustomer(userId, msg.title, msg.body(orderNote), { status });
}

// ---------------------------------------------------------------------------
// GET /orders/my
// ---------------------------------------------------------------------------
router.get("/my", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.uid },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where: { userId: req.uid } }),
    ]);

    const effective = await expirePendingOrders(orders);
    return res.json({ success: true, data: effective, total, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders/business
// ---------------------------------------------------------------------------
router.get("/business", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { ownerId: req.uid } });
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const statusFilter = req.query.status as string | undefined;

    const where: any = { businessId: business.id };
    if (statusFilter) where.status = statusFilter;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit }),
      prisma.order.count({ where }),
    ]);

    const effective = await expirePendingOrders(orders);
    return res.json({ success: true, data: effective, total, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders/:id
// ---------------------------------------------------------------------------
router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    let allowed = order.userId === req.uid;
    if (!allowed) {
      const business = await prisma.business.findUnique({ where: { ownerId: req.uid } });
      if (business && business.id === order.businessId) allowed = true;
    }
    if (!allowed) return res.status(403).json({ success: false, error: "Access denied" });

    const { order: effective } = await autoRejectIfExpired(order);
    return res.json({ success: true, data: effective });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /orders — create a new order
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { businessId, items, deliveryAddress, notes, paymentMethod, paymentTiming: requestedTiming, couponCode } = req.body;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "businessId and items are required" });
    }
    if (!deliveryAddress) {
      return res.status(400).json({ success: false, error: "deliveryAddress is required" });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });
    if (business.isTakingOrders === false) {
      return res.status(400).json({ success: false, error: `${business.name} is not accepting orders right now. Please try again later.` });
    }

    const validatedItems: any[] = [];
    let subTotal = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, error: `Invalid item: ${JSON.stringify(item)}` });
      }
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
      if (product.businessId !== businessId) {
        return res.status(400).json({ success: false, error: "Product does not belong to this business" });
      }
      const stock = Number(product.stock ?? 0);
      if (item.quantity > stock) {
        return res.status(400).json({ success: false, error: `Insufficient stock for "${product.name}". Available: ${stock}` });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      subTotal += lineTotal;

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        productImage: product.imageUrls?.[0] ?? null,
        quantity: item.quantity,
        price: unitPrice,
        lineTotal,
      });
    }

    const effectiveMinimum = Number(business.minimumOrderAmount ?? MINIMUM_ORDER);
    if (subTotal < effectiveMinimum) {
      return res.status(400).json({ success: false, error: `Minimum order amount is Rs. ${effectiveMinimum}. Your subtotal is Rs. ${subTotal}.` });
    }

    const platformFee = PLATFORM_FEE;
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    let couponIdToIncrement: string | null = null;
    if (couponCode) {
      try {
        const couponResult = await computeCouponDiscount(req.uid!, couponCode, subTotal, businessId);
        couponDiscount = couponResult.discountAmount;
        appliedCouponCode = couponResult.code;
        couponIdToIncrement = couponResult.couponId;
      } catch {
        // Coupon validation failed — proceed without discount.
      }
    }
    const finalAmount = subTotal + platformFee - couponDiscount;

    const user = await prisma.user.findUnique({ where: { id: req.uid } });

    const method = paymentMethod || "cash";
    const paymentTiming = (() => {
      if (method === "cash") return "atDelivery";
      if (requestedTiming === "atOrder" || requestedTiming === "atDelivery") return requestedTiming;
      return "atOrder";
    })();
    const paymentStatus = (() => {
      if (method === "cash") return "cod";
      if (paymentTiming === "atOrder") return "completed";
      return "pending";
    })();

    const autoRejectAt = new Date(Date.now() + ORDER_ACCEPTANCE_WINDOW_SECONDS * 1000);
    const trackingUpdates = [{ status: "pending", timestamp: new Date().toISOString(), notes: "Order placed" }];

    const quantitiesByProduct = new Map<string, number>();
    validatedItems.forEach((item) => {
      quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + Number(item.quantity));
    });

    const order = await prisma.$transaction(async (tx) => {
      for (const [productId, requestedQuantity] of quantitiesByProduct) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          const err: any = new Error(`Product ${productId} not found`);
          err.statusCode = 404;
          throw err;
        }
        const availableStock = Number(product.stock ?? 0);
        if (!Number.isFinite(availableStock) || availableStock < requestedQuantity) {
          const err: any = new Error(`Insufficient stock for "${product.name}". Available: ${Math.max(0, availableStock)}`);
          err.statusCode = 400;
          throw err;
        }
        await tx.product.update({ where: { id: productId }, data: { stock: availableStock - requestedQuantity } });
      }

      // Increment coupon usage atomically within the same transaction
      if (couponIdToIncrement) {
        const coupon = await tx.coupon.findUnique({ where: { id: couponIdToIncrement } });
        if (coupon) {
          await tx.coupon.update({ where: { id: couponIdToIncrement }, data: { usageCount: (Number(coupon.usageCount) || 0) + 1 } });
        }
      }

      return tx.order.create({
        data: {
          userId: req.uid!,
          userName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Customer",
          userPhone: user?.phone ?? "",
          businessId,
          businessName: business.name,
          items: { create: validatedItems },
          subTotal,
          platformFee,
          couponCode: appliedCouponCode,
          couponDiscount,
          totalAmount: finalAmount,
          finalAmount,
          deliveryAddressSnapshot: deliveryAddress,
          status: "pending",
          paymentMethod: method,
          paymentTiming,
          paymentStatus,
          notes: notes ?? "",
          trackingUpdates,
          acceptanceWindowSeconds: ORDER_ACCEPTANCE_WINDOW_SECONDS,
          autoRejectAt,
        },
        include: { items: true },
      });
    });

    // Fire-and-forget notifications + socket broadcast
    onOrderCreated(order, business).catch((err) => console.error("onOrderCreated failed", err));
    try { emitOrderUpdate(order.id, order); } catch {}

    return res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    return res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /orders/:id/status — advance order status (owner or customer cancel)
// ---------------------------------------------------------------------------
router.put("/:id/status", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { status, notes, paymentCollectedMethod, deliveryProofImageUrl, deliveryPartnerId } = req.body;
    if (!status) return res.status(400).json({ success: false, error: "status is required" });

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const business = await prisma.business.findUnique({ where: { ownerId: req.uid } });
    const isOwner = !!business && business.id === order.businessId;
    const isCustomer = order.userId === req.uid;

    if (!isOwner && !isCustomer) return res.status(403).json({ success: false, error: "Access denied" });
    if (isCustomer && !isOwner && status !== "cancelled") {
      return res.status(403).json({ success: false, error: "Customers can only cancel orders" });
    }

    const trackingUpdate: any = { status, timestamp: new Date().toISOString(), notes: notes ?? "" };
    const updateData: Record<string, any> = {};

    if (status === "outForDelivery" && isOwner) {
      let assignedId = order.assignedDeliveryPartnerId ?? undefined;
      let assignedName = order.assignedDeliveryPartnerName ?? undefined;

      if (deliveryPartnerId) {
        const partner = await prisma.user.findUnique({ where: { id: String(deliveryPartnerId) } });
        if (!partner) return res.status(404).json({ success: false, error: "Delivery partner not found" });
        if (partner.role !== "deliveryPartner" || partner.businessId !== order.businessId || partner.status !== "active") {
          return res.status(400).json({ success: false, error: "Choose an active delivery partner for this shop" });
        }
        assignedId = partner.id;
        assignedName = `${partner.firstName ?? ""} ${partner.lastName ?? ""}`.trim() || "Delivery partner";
        updateData.assignedDeliveryPartnerId = assignedId;
        updateData.assignedDeliveryPartnerName = assignedName;
        updateData.assignedAt = new Date();
        trackingUpdate.notes = notes || `Out for delivery · assigned to ${assignedName}`;
      }

      if (!assignedId) {
        return res.status(400).json({
          success: false,
          error: "Select a delivery partner before marking Out for Delivery",
          code: "DELIVERY_PARTNER_REQUIRED",
        });
      }
    }

    if (status === "delivered" && isOwner) {
      updateData.deliveredAt = new Date();
      updateData.deliveredBy = req.uid;
      if (typeof deliveryProofImageUrl === "string" && deliveryProofImageUrl) {
        updateData.deliveryProofImageUrl = deliveryProofImageUrl;
      }
      if (isPaymentOutstanding(order.paymentStatus)) {
        const method = ["cash", "upi", "card", "wallet"].includes(paymentCollectedMethod) ? paymentCollectedMethod : order.paymentMethod || "cash";
        updateData.paymentStatus = "completed";
        updateData.paymentCollectedAt = new Date();
        updateData.paymentCollectedBy = req.uid;
        updateData.paymentCollectedMethod = method;
        updateData.paymentMethod = method;
      }
    }

    const isOwnerAcceptance = isOwner && order.status === "pending" && status !== "cancelled" && status !== "rejected";
    const isCancellation = status === "cancelled" || status === "rejected";
    let updated;

    if (isOwnerAcceptance) {
      try {
        updated = await prisma.$transaction(async (tx) => {
          const fresh = await tx.order.findUnique({ where: { id: order.id } });
          if (!fresh || fresh.status !== "pending") throw new Error("ORDER_NOT_PENDING");
          if (fresh.autoRejectAt && Date.now() > fresh.autoRejectAt.getTime()) throw new Error("ACCEPTANCE_WINDOW_EXPIRED");
          return tx.order.update({
            where: { id: order.id },
            data: { status, trackingUpdates: [...(fresh.trackingUpdates as any[]), trackingUpdate], ...updateData },
          });
        });
      } catch (txErr: any) {
        if (txErr?.message === "ACCEPTANCE_WINDOW_EXPIRED") {
          return res.status(409).json({
            success: false,
            error: "This order expired and was auto-rejected because it was not accepted within 60 seconds.",
            code: "ACCEPTANCE_WINDOW_EXPIRED",
          });
        }
        if (txErr?.message === "ORDER_NOT_PENDING") {
          return res.status(409).json({ success: false, error: "This order can no longer be accepted (it is no longer pending).", code: "ORDER_NOT_PENDING" });
        }
        throw txErr;
      }
    } else if (isCancellation) {
      // Restore inventory atomically when cancelling/rejecting
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.order.update({
          where: { id: order.id },
          data: { status, trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate], ...updateData },
        });
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            if (!item.productId || !item.quantity) continue;
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              await tx.product.update({ where: { id: item.productId }, data: { stock: (Number(product.stock) || 0) + Number(item.quantity) } });
            }
          }
        }
        return result;
      });
    } else {
      updated = await prisma.order.update({
        where: { id: order.id },
        data: { status, trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate], ...updateData },
      });
    }

    // Fire-and-forget notifications + socket broadcast
    onOrderStatusChanged(updated).catch((err) => console.error("onOrderStatusChanged failed", err));
    notifyOrderStatusChange(order.userId, status, order.businessName ?? undefined).catch(() => undefined);
    try { emitOrderUpdate(updated.id ?? order.id, updated); } catch {}

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders — list all orders (admin / filtered)
// ---------------------------------------------------------------------------
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { businessId, status, userId } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    const where: any = {};
    if (businessId) where.businessId = businessId as string;
    else if (userId) where.userId = userId as string;
    else if (status) where.status = status as string;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit, include: { items: true } }),
      prisma.order.count({ where }),
    ]);

    return res.json({ success: true, data: orders, total, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
