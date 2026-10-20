const rateLimitStore = new Map<string, { attempts: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export function isRateLimited(phone: string): boolean {
  const entry = rateLimitStore.get(phone);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) return false;
  return entry.attempts >= RATE_LIMIT_MAX;
}

export function recordAttempt(phone: string): void {
  const entry = rateLimitStore.get(phone);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(phone, { attempts: 1, windowStart: Date.now() });
  } else {
    entry.attempts++;
  }
}

// Kept for authenticated phone verification flow (otp.ts)
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const OTP_EXPIRY_MS = 10 * 60 * 1000;

export async function sendOTP(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (isRateLimited(phone)) return { ok: false, error: "Too many attempts." };
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[OTP-DEV] Code for ${phone}: ${code}`);
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_EXPIRY_MS });
  recordAttempt(phone);
  return { ok: true };
}

export async function verifyOTP(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const entry = otpStore.get(phone);
  if (!entry) return { ok: false, error: "No OTP found. Please request a new one." };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { ok: false, error: "OTP expired. Please request a new one." };
  }
  if (code !== entry.code) return { ok: false, error: "Invalid verification code." };
  otpStore.delete(phone);
  return { ok: true };
}
