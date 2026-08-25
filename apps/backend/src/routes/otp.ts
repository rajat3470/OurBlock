import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /otp/send - Send OTP to phone number
router.post("/send", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });

    // Rate limit: max 5 OTPs per phone per 10 minutes
    const key = `${phone}`;
    const existing = otpStore.get(key);
    if (existing && existing.attempts >= 5 && existing.expiresAt > Date.now()) {
      return res.status(429).json({ success: false, error: "Too many attempts. Please try again later." });
    }

    const code = generateOTP();
    otpStore.set(key, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: (existing?.attempts || 0) + 1 });

    // In production, send SMS via Twilio/MSG91/etc
    // For now, log it (development mode)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] Code for ${phone}: ${code}`);
    }

    // TODO: Integrate SMS provider (MSG91, Twilio, etc.)
    // await sendSMS(phone, `Your mohallaMitr verification code is: ${code}`);

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /otp/verify - Verify OTP code
router.post("/verify", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: "Phone and code are required" });
    }

    const key = `${phone}`;
    const stored = otpStore.get(key);

    if (!stored) {
      return res.status(400).json({ success: false, error: "No OTP found. Please request a new one." });
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
    }

    if (stored.code !== code) {
      return res.status(400).json({ success: false, error: "Invalid verification code." });
    }

    // OTP verified — mark phone as verified
    otpStore.delete(key);
    await prisma.user.update({ where: { id: req.uid }, data: { isPhoneVerified: true, phone } });

    return res.json({ success: true, message: "Phone verified successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
