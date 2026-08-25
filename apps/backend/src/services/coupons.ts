import { prisma } from "../lib/prisma";

/**
 * Ported from apps/firebase/functions/src/api/coupons.ts `computeCouponDiscount`.
 * Note: coupon.type "fixed" (issued by the ads reward module) is treated the
 * same as "flat" — this fixes the latent bug documented in
 * BACKEND_FLOW_DOCUMENTATION.md §9.1 item 4 where "fixed" coupons computed a
 * $0 discount in the legacy engine.
 */
export async function computeCouponDiscount(
  uid: string,
  code: string,
  subTotal: number,
  businessId: string
): Promise<{ code: string; discountAmount: number; couponId: string }> {
  const normalizedCode = code.toUpperCase().trim();
  const coupon = await prisma.coupon.findFirst({ where: { code: normalizedCode, status: "active" } });
  if (!coupon) throw new Error("Coupon not found or inactive");

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error("This coupon has expired");
  }
  if (coupon.businessId && coupon.businessId !== businessId) {
    throw new Error("Coupon is not valid for this shop");
  }
  if (coupon.minOrderAmount && subTotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order of Rs ${coupon.minOrderAmount} required for this coupon`);
  }
  if (coupon.usageLimit && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }
  if (coupon.forUserId && coupon.forUserId !== uid) {
    throw new Error("This coupon is not valid for your account");
  }

  if (coupon.perUserLimit) {
    const userUsageCount = await prisma.order.count({ where: { userId: uid, couponCode: normalizedCode } });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new Error("You have already used this coupon the maximum number of times");
    }
  }

  let discountAmount = 0;
  if (coupon.type === "percentage") {
    discountAmount = Math.floor((subTotal * coupon.value) / 100);
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else if (coupon.type === "flat" || coupon.type === "fixed") {
    discountAmount = Math.min(coupon.value, subTotal);
  }

  return { code: normalizedCode, discountAmount, couponId: coupon.id };
}
