import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireSuperAdmin } from "../middleware/superAdmin";
import { AuthedRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireSuperAdmin);

function deriveProductApprovalStatus(product: any): "pending" | "approved" | "rejected" {
  if (product.approvalStatus === "approved" || product.isVerified === true) return "approved";
  if (product.approvalStatus === "rejected") return "rejected";
  return "pending";
}

function parseDateInput(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

// ─── Stats ────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [totalSocieties, totalBusinesses, pendingVerifications, totalUsers, totalOrders] = await Promise.all([
      prisma.society.count({ where: { status: "active" } }),
      prisma.business.count(),
      prisma.business.count({ where: { isVerified: false } }),
      prisma.user.count(),
      prisma.order.count(),
    ]);
    res.json({ success: true, data: { totalSocieties, totalBusinesses, pendingVerifications, totalUsers, totalOrders } });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Orders proxy ───────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: any = {};
    if (status) where.status = status;

    const data = await prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit });
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    console.error("Admin orders error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Societies proxy ────────────────────────────────────────────────────────
router.get("/societies", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const [societies, businesses] = await Promise.all([
      prisma.society.findMany({ orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit }),
      prisma.business.findMany({ select: { societyId: true } }),
    ]);

    const businessCountMap: Record<string, number> = {};
    businesses.forEach((b) => { businessCountMap[b.societyId] = (businessCountMap[b.societyId] ?? 0) + 1; });

    const data = societies.map((s) => ({ ...s, totalBusinesses: businessCountMap[s.id] ?? 0 }));
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Businesses proxy ───────────────────────────────────────────────────────
router.get("/businesses", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const data = await prisma.business.findMany({ orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit });
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Users proxy ─────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const data = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit });
    res.json({ success: true, data: data.map(({ passwordHash, ...u }) => u), pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Create Business and Owner ──────────────────────────────────────────────
router.post("/businesses", async (req, res) => {
  try {
    const { business, owner, societyId } = req.body;
    if (!business?.name || !business?.category || !business?.phone || !business?.address || !societyId) {
      return res.status(400).json({ success: false, error: "Business name, category, phone, address and societyId are all required" });
    }
    if (!owner?.firstName || !owner?.lastName || !owner?.email || !owner?.phone) {
      return res.status(400).json({ success: false, error: "Owner firstName, lastName, email and phone are all required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(owner.email)) return res.status(400).json({ success: false, error: "Invalid owner email address" });
    if (!/^[6-9]\d{9}$/.test(owner.phone)) return res.status(400).json({ success: false, error: "Invalid owner phone number" });

    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email: owner.email }, { phone: owner.phone }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email or phone number already exists" });
    }

    const rawBytes = crypto.randomBytes(16).toString("base64");
    const tempPassword = rawBytes.replace(/[^a-zA-Z0-9]/g, "x").slice(0, 10) + "@1";
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...owner, passwordHash, role: "businessOwner", societyId,
          status: "active", verificationStatus: "pending", mustChangePassword: true,
        },
      });
      const createdBusiness = await tx.business.create({
        data: { ...business, ownerId: user.id, societyId, status: "active", isVerified: false },
      });
      return { user, business: createdBusiness };
    });

    return res.status(201).json({
      success: true,
      data: { business: result.business, email: result.user.email, temporaryPassword: tempPassword },
    });
  } catch (error: any) {
    console.error("Create business and owner error:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/business-owners", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, societyId } = req.body;
    if (!firstName || !lastName || !email || !phone || !societyId) {
      return res.status(400).json({ success: false, error: "firstName, lastName, email, phone and societyId are all required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, error: "Invalid email address" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, error: "Invalid phone number" });

    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ success: false, error: "Society not found" });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email or phone number already exists" });
    }

    const rawBytes = crypto.randomBytes(16).toString("base64");
    const tempPassword = rawBytes.replace(/[^a-zA-Z0-9]/g, "x").slice(0, 10) + "@1";
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        firstName, lastName, email, phone, passwordHash,
        role: "businessOwner", societyId,
        status: "active", verificationStatus: "pending", mustChangePassword: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: { uid: user.id, email, temporaryPassword: tempPassword, message: "Business owner account created. Share credentials securely." },
    });
  } catch (error: any) {
    console.error("Create business owner error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Products approval queue ─────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const { approvalStatus, businessId } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const where: any = {};
    if (businessId) where.businessId = businessId as string;

    const products = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
    const businessIds = [...new Set(products.map((p) => p.businessId))];
    const businesses = await prisma.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } });
    const businessMap: Record<string, string> = {};
    businesses.forEach((b) => { businessMap[b.id] = b.name; });

    const data = products
      .map((product) => ({ ...product, approvalStatus: deriveProductApprovalStatus(product), businessName: businessMap[product.businessId] ?? null }))
      .filter((p) => !approvalStatus || p.approvalStatus === approvalStatus)
      .slice((page - 1) * limit, page * limit);

    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/products/:id/approve", async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { approvalStatus: "approved", isVerified: true, approvalNote: null, status: "active" },
    });
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/products/:id/reject", async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { approvalStatus: "rejected", isVerified: false, approvalNote: req.body.note ?? null, status: "inactive" },
    });
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Verify / Reject business shortcuts ──────────────────────────────────────
router.post("/businesses/:id/verify", async (req, res) => {
  try {
    const business = await prisma.business.update({ where: { id: req.params.id }, data: { isVerified: true } });
    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/businesses/:id/reject", async (req, res) => {
  try {
    const business = await prisma.business.update({ where: { id: req.params.id }, data: { isVerified: false, rejectionReason: req.body.reason ?? null } });
    res.json({ success: true, data: business });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Suspend / Activate user shortcuts ───────────────────────────────────────
router.post("/users/:id/suspend", async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: "suspended", disabled: true } });
    const { passwordHash, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/users/:id/activate", async (req, res) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: "active", disabled: false } });
    const { passwordHash, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Blacklist management ─────────────────────────────────────────────────────
router.get("/blacklist", async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({ where: { status: "suspended" } });
    if (businesses.length === 0) return res.json({ success: true, data: [] });

    const ownerIds = [...new Set(businesses.map((b) => b.ownerId).filter(Boolean))];
    const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } } });
    const ownerMap: Record<string, any> = {};
    owners.forEach((o) => {
      const { passwordHash, ...safe } = o;
      ownerMap[o.id] = safe;
    });

    const data = businesses
      .map((biz) => ({ ...biz, owner: biz.ownerId ? ownerMap[biz.ownerId] ?? null : null }))
      .sort((a, b) => {
        const aTime = a.suspendedAt ? new Date(a.suspendedAt).getTime() : 0;
        const bTime = b.suspendedAt ? new Date(b.suspendedAt).getTime() : 0;
        return bTime - aTime;
      });

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/suspension-history", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const auditEntries = await prisma.suspensionHistory.findMany({ orderBy: { timestamp: "desc" }, take: limit });

    const suspendedBusinesses = await prisma.business.findMany({ where: { status: "suspended" } });
    const auditedIds = new Set(auditEntries.filter((e) => e.action === "suspended").map((e) => e.entityId));

    const synthesized = suspendedBusinesses
      .filter((biz) => !auditedIds.has(biz.id) && biz.suspendedAt)
      .map((biz) => ({
        id: `synth_${biz.id}`,
        action: "suspended" as const,
        entityType: "business",
        entityId: biz.id,
        entityName: biz.name ?? biz.id,
        ownerId: biz.ownerId ?? null,
        reason: biz.suspensionReason ?? "Suspended (legacy — reason not recorded)",
        performedBy: "system",
        timestamp: biz.suspendedAt,
        _synthesized: true,
      }));

    const merged = [...auditEntries, ...synthesized].sort((a, b) => {
      const aT = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bT = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bT - aT;
    });

    return res.json({ success: true, data: merged });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/businesses/:id/blacklist-suspend", async (req: AuthedRequest, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });

    const reason = typeof req.body.reason === "string" && req.body.reason.trim() ? req.body.reason.trim() : "Suspended by admin";
    const adminUid = req.uid ?? "admin";

    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: { status: "suspended", suspendedAt: new Date(), suspensionReason: reason, isTakingOrders: false },
      });
      if (business.ownerId) {
        await tx.user.update({ where: { id: business.ownerId }, data: { status: "suspended", disabled: true } });
      }
      await tx.suspensionHistory.create({
        data: { action: "suspended", entityType: "business", entityId: business.id, entityName: business.name ?? business.id, ownerId: business.ownerId ?? null, reason, performedBy: adminUid },
      });
    });

    const updated = await prisma.business.findUnique({ where: { id: business.id } });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/businesses/:id/blacklist-activate", async (req: AuthedRequest, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) return res.status(404).json({ success: false, error: "Business not found" });

    const adminUid = req.uid ?? "admin";

    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: business.id },
        data: { status: "active", suspendedAt: null, suspensionReason: null, isTakingOrders: true, recentRejections: {} },
      });
      if (business.ownerId) {
        await tx.user.update({ where: { id: business.ownerId }, data: { status: "active", disabled: false } });
      }
      await tx.suspensionHistory.create({
        data: { action: "activated", entityType: "business", entityId: business.id, entityName: business.name ?? business.id, ownerId: business.ownerId ?? null, reason: "Unblocked by admin", performedBy: adminUid },
      });
    });

    const updated = await prisma.business.findUnique({ where: { id: business.id } });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Home Banners CMS ─────────────────────────────────────────────────────────
router.get("/banners", async (req, res) => {
  try {
    const societyId = typeof req.query.societyId === "string" ? req.query.societyId : undefined;
    const where: any = {};
    if (societyId) where.societyId = societyId;

    const banners = await prisma.homeBanner.findMany({ where });
    const data = banners.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/banners", async (req: AuthedRequest, res) => {
  try {
    const { title, subtitle, imageUrl, tagText, ctaText, ctaRoute, societyId, isActive, sortOrder, startAt, endAt, theme } = req.body;
    if (!title || typeof title !== "string") return res.status(400).json({ success: false, error: "title is required" });
    if (!imageUrl || typeof imageUrl !== "string") return res.status(400).json({ success: false, error: "imageUrl is required" });

    const banner = await prisma.homeBanner.create({
      data: {
        title: title.trim(),
        subtitle: typeof subtitle === "string" ? subtitle.trim() : "",
        imageUrl: imageUrl.trim(),
        tagText: typeof tagText === "string" ? tagText.trim() : "TRENDING IN YOUR SOCIETY",
        ctaText: typeof ctaText === "string" ? ctaText.trim() : "",
        ctaRoute: typeof ctaRoute === "string" ? ctaRoute.trim() : "",
        societyId: typeof societyId === "string" && societyId.trim() && societyId !== "global" ? societyId.trim() : null,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
        startAt: parseDateInput(startAt),
        endAt: parseDateInput(endAt),
        theme: typeof theme === "object" && theme ? theme : null,
        createdBy: req.uid,
      },
    });
    return res.status(201).json({ success: true, data: banner });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/banners/:id", async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.homeBanner.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Banner not found" });

    const { title, subtitle, imageUrl, tagText, ctaText, ctaRoute, societyId, isActive, sortOrder, startAt, endAt, theme } = req.body;
    const updates: Record<string, any> = { updatedBy: req.uid };

    if (title !== undefined) updates.title = String(title).trim();
    if (subtitle !== undefined) updates.subtitle = String(subtitle || "").trim();
    if (imageUrl !== undefined) updates.imageUrl = String(imageUrl || "").trim();
    if (tagText !== undefined) updates.tagText = String(tagText || "").trim();
    if (ctaText !== undefined) updates.ctaText = String(ctaText || "").trim();
    if (ctaRoute !== undefined) updates.ctaRoute = String(ctaRoute || "").trim();
    if (societyId !== undefined) updates.societyId = String(societyId || "").trim() === "global" ? null : String(societyId || "").trim() || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updates.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100;
    if (startAt !== undefined) updates.startAt = parseDateInput(startAt);
    if (endAt !== undefined) updates.endAt = parseDateInput(endAt);
    if (theme !== undefined) updates.theme = typeof theme === "object" && theme ? theme : null;

    const updated = await prisma.homeBanner.update({ where: { id: req.params.id }, data: updates });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/banners/:id", async (req, res) => {
  try {
    const existing = await prisma.homeBanner.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Banner not found" });
    await prisma.homeBanner.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
