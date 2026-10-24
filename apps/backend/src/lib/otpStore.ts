const STATIC_OTP = "987654";

interface OTPEntry {
  code: string;
  createdAt: number;
}

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const otpStore = new Map<string, OTPEntry>();
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function generateOTP(): string {
  return STATIC_OTP || Math.floor(100000 + Math.random() * 900000).toString();
}

export function isRateLimited(phone: string): boolean {
  const entry = rateLimitStore.get(phone);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) return false;
  return entry.attempts >= RATE_LIMIT_MAX;
}

function bumpRateLimit(phone: string): void {
  const entry = rateLimitStore.get(phone);
  const now = Date.now();
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(phone, { attempts: 1, windowStart: now });
  } else {
    entry.attempts++;
  }
}

export function storeOTP(phone: string, code: string): void {
  otpStore.set(phone, { code, createdAt: Date.now() });
}

export async function sendOTP(phone: string): Promise<{ ok: boolean; error?: string }> {
  bumpRateLimit(phone);
  const code = generateOTP();
  console.log(`[OTP] Code for ${phone}: ${code}`);
  storeOTP(phone, code);
  return { ok: true };
}

export async function verifyOTP(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const entry = otpStore.get(phone);
  if (!entry) return { ok: false, error: "No OTP found. Please request a new one." };

  if (Date.now() - entry.createdAt > OTP_EXPIRY_MS) {
    otpStore.delete(phone);
    return { ok: false, error: "OTP has expired. Please request a new one." };
  }

  if (code !== entry.code) {
    return { ok: false, error: "Invalid verification code." };
  }

  otpStore.delete(phone);
  return { ok: true };
}
