const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY || "";
const TWO_FACTOR_BASE = "https://2factor.in/API/V1";

// Maps phone → { sessionId, attempts, windowStart } for rate limiting
const sessionStore = new Map<string, { sessionId: string; attempts: number; windowStart: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function strip91(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned.slice(2);
  return cleaned;
}

export function isRateLimited(phone: string): boolean {
  const entry = sessionStore.get(phone);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) return false;
  return entry.attempts >= RATE_LIMIT_MAX;
}

export async function sendOTP(phone: string): Promise<{ ok: boolean; error?: string }> {
  const tenDigit = strip91(phone);

  if (!TWO_FACTOR_API_KEY) {
    // Fallback for dev without API key — generate locally and log
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[OTP-DEV] Code for ${phone}: ${code}`);
    const entry = sessionStore.get(phone);
    sessionStore.set(phone, {
      sessionId: `dev-${code}`,
      attempts: (entry?.attempts || 0) + 1,
      windowStart: entry?.windowStart || Date.now(),
    });
    return { ok: true };
  }

  try {
    const url = `${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/${tenDigit}/AUTOGEN`;
    const res = await fetch(url);
    const data = await res.json() as { Status: string; Details: string };

    if (data.Status === "Success") {
      const entry = sessionStore.get(phone);
      sessionStore.set(phone, {
        sessionId: data.Details,
        attempts: (entry?.attempts || 0) + 1,
        windowStart: entry?.windowStart || Date.now(),
      });
      return { ok: true };
    }

    return { ok: false, error: data.Details || "Failed to send OTP" };
  } catch (err: any) {
    console.error("[2Factor] Send OTP error:", err.message);
    return { ok: false, error: "SMS service unavailable. Please try again." };
  }
}

export async function verifyOTP(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const entry = sessionStore.get(phone);
  if (!entry) return { ok: false, error: "No OTP found. Please request a new one." };

  // Dev fallback — session IDs prefixed with "dev-" use local verification
  if (entry.sessionId.startsWith("dev-")) {
    const expected = entry.sessionId.replace("dev-", "");
    if (code !== expected) return { ok: false, error: "Invalid verification code." };
    sessionStore.delete(phone);
    return { ok: true };
  }

  try {
    const url = `${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${entry.sessionId}/${code}`;
    const res = await fetch(url);
    const data = await res.json() as { Status: string; Details: string };

    if (data.Status === "Success" && data.Details === "OTP Matched") {
      sessionStore.delete(phone);
      return { ok: true };
    }

    if (data.Details === "OTP Mismatch") {
      return { ok: false, error: "Invalid verification code." };
    }

    if (data.Details === "Session Expired") {
      sessionStore.delete(phone);
      return { ok: false, error: "OTP has expired. Please request a new one." };
    }

    return { ok: false, error: data.Details || "Verification failed" };
  } catch (err: any) {
    console.error("[2Factor] Verify OTP error:", err.message);
    return { ok: false, error: "SMS service unavailable. Please try again." };
  }
}

// Legacy exports kept for backward compatibility with existing route signatures
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(phone: string, code: string): void {
  const entry = sessionStore.get(phone);
  sessionStore.set(phone, {
    sessionId: `dev-${code}`,
    attempts: (entry?.attempts || 0) + 1,
    windowStart: entry?.windowStart || Date.now(),
  });
}
