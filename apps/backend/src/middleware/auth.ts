import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  uid?: string;
  role?: string;
}

// Dev-only mock-token bypass, mirrors the legacy Firebase mock tokens so the
// mobile app's dev mode keeps working without a real login flow. Disable via
// ENABLE_MOCK_AUTH=false in production.
const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
  "mock-access-token-deliverypartner": "mock-delivery-partner-1",
};

function mockAuthEnabled(): boolean {
  return process.env.ENABLE_MOCK_AUTH !== "false";
}

/** Core bearer-token auth: attaches req.uid/req.role or responds 401. */
export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  if (mockAuthEnabled() && token in MOCK_TOKEN_UIDS) {
    req.uid = MOCK_TOKEN_UIDS[token];
    const user = await prisma.user.findUnique({ where: { id: req.uid } });
    req.role = user?.role;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    req.uid = decoded.uid;
    req.role = decoded.role;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

/** Optional auth: attaches req.uid if a valid token is present, never blocks. */
export const optionalAuth = async (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return next();
  if (mockAuthEnabled() && token in MOCK_TOKEN_UIDS) {
    req.uid = MOCK_TOKEN_UIDS[token];
    return next();
  }
  try {
    const decoded = verifyAccessToken(token);
    req.uid = decoded.uid;
    req.role = decoded.role;
  } catch {
    /* ignore invalid token for optional auth */
  }
  return next();
};

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    return next();
  };
}
