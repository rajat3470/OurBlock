import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || "1h") as jwt.SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN_DAYS = 30;

export interface AccessTokenPayload {
  uid: string;
  role: string;
}

/** Short-lived access token carrying uid + role claim. */
export function signAccessToken(payload: AccessTokenPayload): { token: string; expiresIn: number } {
  const token = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const decoded = jwt.decode(token) as { exp?: number; iat?: number } | null;
  const expiresIn =
    decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : 3600;
  return { token, expiresIn };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

/** Refresh tokens are opaque random strings persisted in the DB (see RefreshToken model),
 *  not self-contained JWTs — this lets us revoke them server-side. */
export function generateRefreshTokenValue(): { value: string; expiresAt: Date } {
  const value = randomUUID() + randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  return { value, expiresAt };
}

export { REFRESH_SECRET };
