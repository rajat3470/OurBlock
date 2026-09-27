import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getPlatformConfig } from "../models/index";

const router = Router();

router.post("/claim-reward", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.uid!;
  try {
    const config = await getPlatformConfig();
    const maxClaims = config.adsRewardedMaxClaimsPerDay;
    const minRs = config.adsRewardedMinRs;
    const maxRs = config.adsRewardedMaxRs;

    const today = new Date().toISOString().slice(0, 10);
    const existingClaim = await prisma.adRewardClaim.findUnique({ where: { userId_date: { userId: uid, date: today } } });
    const claimsToday = existingClaim?.count ?? 0;

    if (claimsToday >= maxClaims) {
      return res.status(429).json({ success: false, error: "Daily ad reward limit reached. Come back tomorrow!" });
    }

    const code = `ADR-${uid.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const discountAmount = Math.floor(Math.random() * (maxRs - minRs + 1)) + minRs;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.coupon.create({
      data: {
        code,
        type: "fixed",
        value: discountAmount,
        minOrderAmount: 50,
        maxDiscount: discountAmount,
        usageLimit: 1,
        perUserLimit: 1,
        status: "active",
        couponSource: "rewarded_ad",
        forUserId: uid,
        expiresAt,
      },
    });

    await prisma.adRewardClaim.upsert({
      where: { userId_date: { userId: uid, date: today } },
      update: { count: claimsToday + 1, lastClaimedAt: new Date() },
      create: { userId: uid, date: today, count: 1 },
    });

    return res.json({ success: true, couponCode: code, discountAmount, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("claim-reward error:", err);
    return res.status(500).json({ success: false, error: "Failed to issue reward. Try again." });
  }
});

export default router;
