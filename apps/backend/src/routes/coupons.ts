import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { computeCouponDiscount } from "../services/coupons";

const router = Router();

router.post("/validate", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { code, businessId, subTotal } = req.body;
    if (!code) return res.status(400).json({ success: false, error: "code is required" });
    if (!businessId) return res.status(400).json({ success: false, error: "businessId is required" });
    if (typeof subTotal !== "number" || subTotal <= 0) {
      return res.status(400).json({ success: false, error: "Valid subTotal is required" });
    }

    const result = await computeCouponDiscount(req.uid!, code, subTotal, businessId);
    return res.json({ success: true, data: { code: result.code, discountAmount: result.discountAmount, finalTotal: subTotal - result.discountAmount } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 20 });
    const data = coupons.map((c) => ({
      id: c.id, code: c.code, type: c.type, value: c.value,
      maxDiscount: c.maxDiscount ?? null, minOrderAmount: c.minOrderAmount ?? 0,
      description: c.description ?? null, expiresAt: c.expiresAt ?? null,
    }));
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
