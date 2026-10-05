import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { createCashfreeOrder, getCashfreeOrderStatus, verifyWebhookSignature } from "../lib/cashfree";
import { ORDER_FEES, ORDER_ACCEPTANCE_WINDOW_SECONDS } from "../shared/constants";
import { computeCouponDiscount } from "../services/coupons";
import { getPlatformConfig } from "../models/index";
import { onOrderCreated } from "../services/orderEvents";
import { emitOrderUpdate } from "../lib/socket";

const router = Router();

// ---------------------------------------------------------------------------
// POST /payments/create-order
// Validates cart, creates a Cashfree payment session, stores a "pending_payment"
// order record so we can finalize it on webhook confirmation.
// ---------------------------------------------------------------------------
router.post("/create-order", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { businessId, items, deliveryAddress, notes, paymentMethod, couponCode } = req.body;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "businessId and items are required" });
    }
    if (!deliveryAddress) {
      return res.status(400).json({ success: false, error: "deliveryAddress is required" });
    }
    if (!paymentMethod || paymentMethod === "cash") {
      return res.status(400).json({ success: false, error: "Use the regular order endpoint for cash payments" });
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });
    if (business.isTakingOrders === false) {
      return res.status(400).json({ success: false, error: `${business.name} is not accepting orders right now.` });
    }

    // Validate items and compute subtotal (same logic as orders.ts)
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
      if (item.quantity > Number(product.stock ?? 0)) {
        return res.status(400).json({ success: false, error: `Insufficient stock for "${product.name}"` });
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

    const effectiveMinimum = Number(business.minimumOrderAmount ?? ORDER_FEES.MINIMUM_ORDER);
    if (subTotal < effectiveMinimum) {
      return res.status(400).json({ success: false, error: `Minimum order amount is Rs. ${effectiveMinimum}` });
    }

    const dbConfig = await getPlatformConfig();
    const platformFee = dbConfig.platformFeeAmount;
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    let couponIdToIncrement: string | null = null;
    if (couponCode) {
      try {
        const couponResult = await computeCouponDiscount(req.uid!, couponCode, subTotal, businessId);
        couponDiscount = couponResult.discountAmount;
        appliedCouponCode = couponResult.code;
        couponIdToIncrement = couponResult.couponId;
      } catch { /* proceed without discount */ }
    }
    const baseAmount = subTotal + platformFee - couponDiscount;
    const pgFeePercent = paymentMethod === "card"
      ? (dbConfig.cardFeePercent ?? 0)
      : (dbConfig.upiFeePercent ?? 0);
    const paymentGatewayFee = pgFeePercent > 0
      ? Math.round(baseAmount * pgFeePercent) / 100
      : 0;
    const finalAmount = baseAmount + paymentGatewayFee;

    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    const phone = user?.phone || deliveryAddress.phone || "9999999999";

    // Create Cashfree order
    const cfOrderId = `order_${req.uid!.slice(-6)}_${Date.now()}`;
    const cfOrder = await createCashfreeOrder({
      orderId: cfOrderId,
      orderAmount: finalAmount,
      customerId: req.uid!,
      customerPhone: phone,
      customerEmail: user?.email,
      customerName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || undefined,
    });

    // Store a pending-payment order so the webhook can finalize it
    const autoRejectAt = new Date(Date.now() + ORDER_ACCEPTANCE_WINDOW_SECONDS * 1000);
    const order = await prisma.order.create({
      data: {
        userId: req.uid!,
        userName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Customer",
        userPhone: phone,
        businessId,
        businessName: business.name,
        items: { create: validatedItems },
        subTotal,
        platformFee,
        couponCode: appliedCouponCode,
        couponDiscount,
        paymentGatewayFee,
        totalAmount: finalAmount,
        finalAmount,
        deliveryAddressSnapshot: deliveryAddress,
        status: "pending",
        paymentMethod,
        paymentTiming: "atOrder",
        paymentStatus: "pending",
        cfOrderId,
        paymentSessionId: cfOrder.payment_session_id,
        notes: notes ?? "",
        trackingUpdates: [{ status: "pending", timestamp: new Date().toISOString(), notes: "Awaiting payment" }],
        acceptanceWindowSeconds: ORDER_ACCEPTANCE_WINDOW_SECONDS,
        autoRejectAt,
      },
      include: { items: true },
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        cfOrderId,
        paymentSessionId: cfOrder.payment_session_id,
        environment: process.env.CASHFREE_ENV || "sandbox",
      },
    });
  } catch (error: any) {
    console.error("payments/create-order error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /payments/verify
// Mobile calls this after the Cashfree SDK returns — we check with Cashfree
// API whether the payment actually succeeded.
// ---------------------------------------------------------------------------
router.post("/verify", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { cfOrderId } = req.body;
    if (!cfOrderId) {
      return res.status(400).json({ success: false, error: "cfOrderId is required" });
    }

    const order = await prisma.order.findFirst({
      where: { cfOrderId, userId: req.uid },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.paymentStatus === "completed") {
      return res.json({ success: true, data: order, paymentStatus: "completed" });
    }

    const cfStatus = await getCashfreeOrderStatus(cfOrderId);

    if (cfStatus.order_status === "PAID") {
      // Decrement stock atomically
      const quantitiesByProduct = new Map<string, number>();
      (order.items as any[]).forEach((item: any) => {
        quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + Number(item.quantity));
      });

      const updated = await prisma.$transaction(async (tx) => {
        for (const [productId, qty] of quantitiesByProduct) {
          const product = await tx.product.findUnique({ where: { id: productId } });
          if (!product) throw new Error(`Product ${productId} not found`);
          const stock = Number(product.stock ?? 0);
          if (stock < qty) throw new Error(`Insufficient stock for "${product.name}"`);
          await tx.product.update({ where: { id: productId }, data: { stock: stock - qty } });
        }

        // Increment coupon usage
        if (order.couponCode) {
          const coupon = await tx.coupon.findFirst({ where: { code: order.couponCode } });
          if (coupon) {
            await tx.coupon.update({ where: { id: coupon.id }, data: { usageCount: (Number(coupon.usageCount) || 0) + 1 } });
          }
        }

        return tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "completed",
            trackingUpdates: [
              ...(order.trackingUpdates as any[]),
              { status: "pending", timestamp: new Date().toISOString(), notes: "Payment confirmed" },
            ],
          },
          include: { items: true },
        });
      });

      const business = await prisma.business.findUnique({ where: { id: order.businessId } });
      if (business) {
        onOrderCreated(updated, business).catch((err) => console.error("onOrderCreated failed", err));
      }
      try { emitOrderUpdate(updated.id, updated); } catch {}

      return res.json({ success: true, data: updated, paymentStatus: "completed" });
    }

    if (cfStatus.order_status === "EXPIRED" || cfStatus.order_status === "TERMINATED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "failed",
          status: "cancelled",
          trackingUpdates: [
            ...(order.trackingUpdates as any[]),
            { status: "cancelled", timestamp: new Date().toISOString(), notes: "Payment failed or expired" },
          ],
        },
      });
      return res.json({ success: false, error: "Payment failed or expired", paymentStatus: "failed" });
    }

    // Still active/processing
    return res.json({ success: true, data: order, paymentStatus: "active" });
  } catch (error: any) {
    console.error("payments/verify error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /payments/webhook — Cashfree webhook callback
// Raw body needed for signature verification.
// ---------------------------------------------------------------------------
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;
    const rawBody = (req as any).rawBody as string;

    if (!signature || !timestamp || !verifyWebhookSignature(rawBody, timestamp, signature)) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    const { data } = req.body;
    const cfOrderId = data?.order?.order_id;
    const paymentStatus = data?.payment?.payment_status;

    if (!cfOrderId) return res.status(400).json({ success: false, error: "Missing order_id" });

    const order = await prisma.order.findFirst({
      where: { cfOrderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    if (order.paymentStatus === "completed") {
      return res.json({ success: true });
    }

    if (paymentStatus === "SUCCESS") {
      const quantitiesByProduct = new Map<string, number>();
      (order.items as any[]).forEach((item: any) => {
        quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + Number(item.quantity));
      });

      const updated = await prisma.$transaction(async (tx) => {
        for (const [productId, qty] of quantitiesByProduct) {
          const product = await tx.product.findUnique({ where: { id: productId } });
          if (product) {
            await tx.product.update({ where: { id: productId }, data: { stock: Math.max(0, Number(product.stock ?? 0) - qty) } });
          }
        }
        if (order.couponCode) {
          const coupon = await tx.coupon.findFirst({ where: { code: order.couponCode } });
          if (coupon) {
            await tx.coupon.update({ where: { id: coupon.id }, data: { usageCount: (Number(coupon.usageCount) || 0) + 1 } });
          }
        }
        return tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "completed",
            trackingUpdates: [
              ...(order.trackingUpdates as any[]),
              { status: "pending", timestamp: new Date().toISOString(), notes: "Payment confirmed via webhook" },
            ],
          },
          include: { items: true },
        });
      });

      const business = await prisma.business.findUnique({ where: { id: order.businessId } });
      if (business) {
        onOrderCreated(updated, business).catch(() => {});
      }
      try { emitOrderUpdate(updated.id, updated); } catch {}
    } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "failed",
          status: "cancelled",
          trackingUpdates: [
            ...(order.trackingUpdates as any[]),
            { status: "cancelled", timestamp: new Date().toISOString(), notes: `Payment ${paymentStatus.toLowerCase()}` },
          ],
        },
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("payments/webhook error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
