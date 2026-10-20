import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { sendOTP, verifyOTP, isRateLimited } from "../lib/otpStore";

const router = Router();

// POST /otp/send - Send OTP to phone number (authenticated - for phone verification)
router.post("/send", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });

    if (isRateLimited(phone)) {
      return res.status(429).json({ success: false, error: "Too many attempts. Please try again later." });
    }

    const result = await sendOTP(phone);
    if (!result.ok) {
      return res.status(500).json({ success: false, error: result.error });
    }

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /otp/verify - Verify OTP code (authenticated - for phone verification)
router.post("/verify", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: "Phone and code are required" });
    }

    const result = await verifyOTP(phone, code);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }

    await prisma.user.update({ where: { id: req.uid }, data: { isPhoneVerified: true, phone } });

    return res.json({ success: true, message: "Phone verified successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
