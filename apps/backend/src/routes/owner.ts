import { Router } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { autoRejectIfExpired, isExpiredPending } from "../services/orderExpiry";
import { evaluateBlacklistRejection } from "../services/blacklist";
import { emitOrderUpdate } from "../lib/socket";
import { onOrderStatusChanged } from "../services/orderEvents";

const router = Router();

async function getOwnerBusiness(uid: string) {
  return prisma.business.findUnique({ where: { ownerId: uid } });
}

// ---------------------------------------------------------------------------
// GET /owner/business
// ---------------------------------------------------------------------------
router.get("/business", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    return res.json({ success: true, data: business });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/products
// ---------------------------------------------------------------------------
router.get("/products", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } });

    const products = await prisma.product.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return res.json({ success: true, data: products, pagination: { page, limit, total: products.length, totalPages: Math.ceil(products.length / limit) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/products
// ---------------------------------------------------------------------------
router.post("/products", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) {
      return res.status(404).json({ success: false, error: "No business found for this owner. Ask an admin to set up your business first." });
    }
    if (!business.isVerified) {
      return res.status(403).json({ success: false, error: "Your business must be verified by an admin before you can add products." });
    }

    const product = await prisma.product.create({
      data: {
        ...req.body,
        businessId: business.id,
        status: "inactive",
        isVerified: false,
        approvalStatus: "pending",
        approvalNote: null,
      },
    });
    return res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /owner/products/:id
// ---------------------------------------------------------------------------
router.put("/products/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    if (product.businessId !== business.id) return res.status(403).json({ success: false, error: "Product does not belong to your business" });

    const { businessId: _ignored, ...safeBody } = req.body;
    const updated = await prisma.product.update({ where: { id: req.params.id }, data: { ...safeBody, businessId: business.id } });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /owner/products/:id
// ---------------------------------------------------------------------------
router.delete("/products/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    if (product.businessId !== business.id) return res.status(403).json({ success: false, error: "Product does not belong to your business" });

    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/orders
// ---------------------------------------------------------------------------
router.get("/orders", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } });

    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const effective = await Promise.all(
      orders.map(async (order) => {
        if (!isExpiredPending(order)) return order;
        const { order: updated } = await autoRejectIfExpired(order);
        return updated;
      })
    );

    return res.json({ success: true, data: effective, pagination: { page, limit, total: effective.length, totalPages: Math.ceil(effective.length / limit) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/orders/:orderId/status
// ---------------------------------------------------------------------------
router.patch("/orders/:orderId/status", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: "status is required" });

    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== business.id) return res.status(403).json({ success: false, error: "Order does not belong to your business" });

    const trackingUpdate = { status, timestamp: new Date().toISOString() };
    const isAcceptance = order.status === "pending" && status !== "cancelled" && status !== "rejected";
    let updated;

    if (isAcceptance) {
      try {
        updated = await prisma.$transaction(async (tx) => {
          const fresh = await tx.order.findUnique({ where: { id: order.id } });
          if (!fresh || fresh.status !== "pending") throw new Error("ORDER_NOT_PENDING");
          if (fresh.autoRejectAt && Date.now() > fresh.autoRejectAt.getTime()) throw new Error("ACCEPTANCE_WINDOW_EXPIRED");
          return tx.order.update({
            where: { id: order.id },
            data: { status, trackingUpdates: [...(fresh.trackingUpdates as any[]), trackingUpdate] },
          });
        });
      } catch (txErr: any) {
        if (txErr?.message === "ACCEPTANCE_WINDOW_EXPIRED") {
          return res.status(409).json({ success: false, error: "This order expired and was auto-rejected because it was not accepted within 60 seconds.", code: "ACCEPTANCE_WINDOW_EXPIRED" });
        }
        if (txErr?.message === "ORDER_NOT_PENDING") {
          return res.status(409).json({ success: false, error: "This order can no longer be accepted (it is no longer pending).", code: "ORDER_NOT_PENDING" });
        }
        throw txErr;
      }
    } else {
      updated = await prisma.order.update({
        where: { id: order.id },
        data: { status, trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate] },
      });
    }

    // Fire-and-forget notifications + socket broadcast
    onOrderStatusChanged(updated).catch((err) => console.error("onOrderStatusChanged failed", err));
    try { emitOrderUpdate(updated.id ?? order.id, updated); } catch {}

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/orders/:orderId/reject — blacklist-aware rejection
// ---------------------------------------------------------------------------
router.post("/orders/:orderId/reject", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Rejection reason is required" });
    }

    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    if (business.suspendedAt) {
      return res.status(403).json({
        success: false,
        error: "Your account is suspended. Please contact the admin to unblock your account.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== business.id) return res.status(403).json({ success: false, error: "Order does not belong to your business" });
    if (order.status !== "pending") {
      return res.status(400).json({ success: false, error: `Cannot reject order with status "${order.status}". Only pending orders can be rejected.` });
    }

    const { shouldSuspend } = await evaluateBlacklistRejection(business.id, order.userId, req.uid!);

    const trackingUpdate = {
      status: "rejected",
      timestamp: new Date().toISOString(),
      rejectionReason: reason.trim(),
      rejectedBy: "business_owner",
      notes: `Order rejected by ${business.name}: ${reason}`,
    };

    // Reject the order and restore inventory atomically
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "rejected",
          rejectionReason: reason.trim(),
          rejectedAt: new Date(),
          rejectedBy: "business_owner",
          trackingUpdates: [...(order.trackingUpdates as any[]), trackingUpdate],
        },
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

    // Fire-and-forget notifications + socket broadcast
    onOrderStatusChanged(updated).catch((err) => console.error("onOrderStatusChanged (owner reject) failed", err));
    try { emitOrderUpdate(updated.id ?? order.id, updated); } catch {}

    return res.json({ success: true, data: updated, ...(shouldSuspend ? { accountSuspended: true } : {}) });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/business/taking-orders
// ---------------------------------------------------------------------------
router.patch("/business/taking-orders", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { isTakingOrders } = req.body;
    if (typeof isTakingOrders !== "boolean") return res.status(400).json({ success: false, error: "isTakingOrders must be a boolean" });
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    await prisma.business.update({ where: { id: business.id }, data: { isTakingOrders } });
    return res.json({ success: true, data: { isTakingOrders } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/business/settings
// ---------------------------------------------------------------------------
router.patch("/business/settings", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { minimumOrderAmount, estimatedDeliveryTime, preparationTime, deliveryFee, tags } = req.body;
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    const updates: Record<string, any> = {};
    if (minimumOrderAmount !== undefined) updates.minimumOrderAmount = Number(minimumOrderAmount);
    if (estimatedDeliveryTime !== undefined) updates.estimatedDeliveryTime = String(estimatedDeliveryTime);
    if (preparationTime !== undefined) updates.preparationTime = String(preparationTime);
    if (deliveryFee !== undefined) updates.deliveryFee = Number(deliveryFee);
    if (Array.isArray(tags)) updates.tags = tags.map(String);

    const updated = await prisma.business.update({ where: { id: business.id }, data: updates });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/business/image
// ---------------------------------------------------------------------------
router.patch("/business/image", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { imageUrl, bannerUrl } = req.body;
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    const updates: Record<string, any> = {};
    if (typeof imageUrl === "string") updates.imageUrl = imageUrl.trim() || null;
    if (typeof bannerUrl === "string") updates.bannerUrl = bannerUrl.trim() || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, error: "imageUrl or bannerUrl is required" });

    const updated = await prisma.business.update({ where: { id: business.id }, data: updates });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/analytics
// ---------------------------------------------------------------------------
router.get("/analytics", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.json({ success: true, data: { daily: [], popularItems: [], totalRevenue7d: 0 } });

    const orders = await prisma.order.findMany({
      where: { businessId: business.id, status: "delivered" },
      include: { items: true },
    });

    const days: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, revenue: 0, orders: 0 };
    }

    const itemCounts: Record<string, { productId: string; name: string; count: number; revenue: number }> = {};

    orders.forEach((order) => {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (days[key]) {
        days[key].revenue += Number(order.finalAmount ?? order.totalAmount ?? 0);
        days[key].orders += 1;
      }
      order.items.forEach((item) => {
        if (!itemCounts[item.productId]) {
          itemCounts[item.productId] = { productId: item.productId, name: item.productName ?? item.productId, count: 0, revenue: 0 };
        }
        itemCounts[item.productId].count += Number(item.quantity ?? 1);
        itemCounts[item.productId].revenue += Number(item.lineTotal ?? 0);
      });
    });

    const popularItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);
    const daily = Object.values(days);
    const totalRevenue7d = daily.reduce((sum, d) => sum + d.revenue, 0);

    return res.json({ success: true, data: { daily, popularItems, totalRevenue7d } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Coupons (owner-scoped)
// ---------------------------------------------------------------------------
router.post("/coupons", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    const { code, type, value, minOrderAmount, maxDiscount, expiresAt, usageLimit, description } = req.body;
    if (!code || !type || !value) return res.status(400).json({ success: false, error: "code, type, and value are required" });
    if (!["percentage", "flat"].includes(type)) return res.status(400).json({ success: false, error: "type must be percentage or flat" });

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, error: "Coupon code already exists" });

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type,
        value: Number(value),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        businessId: business.id,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: 1,
        description: description ?? "",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active",
      },
    });
    return res.status(201).json({ success: true, data: coupon });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/coupons", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.json({ success: true, data: [] });

    const coupons = await prisma.coupon.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, data: coupons });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/coupons/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found" });

    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) return res.status(404).json({ success: false, error: "Coupon not found" });
    if (coupon.businessId !== business.id) return res.status(403).json({ success: false, error: "Coupon does not belong to your business" });

    await prisma.coupon.update({ where: { id: req.params.id }, data: { status: "inactive" } });
    return res.json({ success: true, message: "Coupon deactivated" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/stats
// ---------------------------------------------------------------------------
router.get("/stats", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) {
      return res.json({ success: true, data: { totalProducts: 0, totalOrders: 0, pendingOrders: 0, lowStockProducts: 0, todayRevenue: 0 } });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalProducts, totalOrders, pendingOrders, lowStockProducts, todayDelivered] = await Promise.all([
      prisma.product.count({ where: { businessId: business.id } }),
      prisma.order.count({ where: { businessId: business.id } }),
      prisma.order.count({ where: { businessId: business.id, status: "pending" } }),
      prisma.product.count({ where: { businessId: business.id, stock: { lte: 5 } } }),
      prisma.order.findMany({ where: { businessId: business.id, status: "delivered", createdAt: { gte: startOfToday } }, take: 100 }),
    ]);

    const todayRevenue = todayDelivered.reduce((sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? 0), 0);

    return res.json({ success: true, data: { totalProducts, totalOrders, pendingOrders, lowStockProducts, todayRevenue } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Delivery partners
// ---------------------------------------------------------------------------
router.get("/delivery-partners", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const partners = await prisma.user.findMany({
      where: { role: "deliveryPartner", businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, businessId: true, societyId: true, createdAt: true, updatedAt: true },
    });

    return res.json({ success: true, data: partners });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/delivery-partners", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const { firstName, lastName, email, phone, password } = req.body ?? {};
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ success: false, error: "firstName, lastName, email, phone, and password are required" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    }
    const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, error: "Enter a valid 10-digit Indian phone number" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: normalizedEmail }, { phone: normalizedPhone }] } });
    if (existing) return res.status(409).json({ success: false, error: "This email or phone number is already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const partner = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: "deliveryPartner",
        societyId: business.societyId,
        businessId: business.id,
        ownerId: req.uid,
        businessName: business.name ?? "Shop",
        businessAddress: business.address ?? "",
        businessPhone: business.phone ?? "",
        businessImageUrl: business.imageUrl ?? null,
        businessCategory: business.category ?? null,
        isEmailVerified: true,
        isPhoneVerified: false,
        status: "active",
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: partner.id, firstName: partner.firstName, lastName: partner.lastName, email: partner.email,
        phone: partner.phone, status: partner.status, businessId: partner.businessId, societyId: partner.societyId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/delivery-partners/:id", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const partner = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!partner) return res.status(404).json({ success: false, error: "Delivery partner not found" });
    if (partner.role !== "deliveryPartner" || partner.businessId !== business.id) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { status } = req.body ?? {};
    if (status !== "active" && status !== "inactive") return res.status(400).json({ success: false, error: "status must be active or inactive" });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status, disabled: status === "inactive" },
    });

    return res.json({
      success: true,
      data: { id: updated.id, firstName: updated.firstName, lastName: updated.lastName, email: updated.email, phone: updated.phone, status: updated.status, businessId: updated.businessId, societyId: updated.societyId },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/orders/:orderId/assign-delivery-partner
// ---------------------------------------------------------------------------
router.post("/orders/:orderId/assign-delivery-partner", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const business = await getOwnerBusiness(req.uid!);
    if (!business) return res.status(404).json({ success: false, error: "No business found for this owner" });

    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    if (order.businessId !== business.id) return res.status(403).json({ success: false, error: "Access denied" });

    const assignable = ["confirmed", "preparing", "ready", "outForDelivery"];
    if (!assignable.includes(order.status)) {
      return res.status(400).json({ success: false, error: "Only active orders can be assigned to a delivery partner" });
    }

    const { partnerId } = req.body ?? {};
    const previousPartnerId = order.assignedDeliveryPartnerId ?? undefined;

    if (partnerId === null || partnerId === undefined || partnerId === "") {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          assignedDeliveryPartnerId: null,
          assignedDeliveryPartnerName: null,
          assignedAt: null,
          trackingUpdates: [...(order.trackingUpdates as any[]), { status: order.status, timestamp: new Date().toISOString(), notes: "Delivery partner unassigned" }],
        },
      });
      try { emitOrderUpdate(updated.id ?? order.id, updated, previousPartnerId); } catch {}
      return res.json({ success: true, data: updated });
    }

    const partner = await prisma.user.findUnique({ where: { id: String(partnerId) } });
    if (!partner) return res.status(404).json({ success: false, error: "Delivery partner not found" });
    if (partner.role !== "deliveryPartner" || partner.businessId !== business.id || partner.status !== "active") {
      return res.status(400).json({ success: false, error: "Choose an active delivery partner for this shop" });
    }

    const partnerName = `${partner.firstName ?? ""} ${partner.lastName ?? ""}`.trim() || "Delivery partner";
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        assignedDeliveryPartnerId: partner.id,
        assignedDeliveryPartnerName: partnerName,
        assignedAt: new Date(),
        trackingUpdates: [...(order.trackingUpdates as any[]), { status: order.status, timestamp: new Date().toISOString(), notes: `Assigned to ${partnerName}` }],
      },
    });

    try { emitOrderUpdate(updated.id ?? order.id, updated, previousPartnerId); } catch {}
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
