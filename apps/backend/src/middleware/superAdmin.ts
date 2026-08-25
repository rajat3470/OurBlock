import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { normalizeRole, getSuperAdminEmailAllowlist } from "../shared/constants";

const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
};

/**
 * Super-admin gate: prefers the JWT role claim, falls back to the Firestore-
 * equivalent `users.role` column, and finally an email allowlist — mirrors
 * `admin.ts`'s `requireSuperAdmin` exactly.
 */
export const requireSuperAdmin = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ success: false, error: "No token provided" });

  try {
    let uid = "";
    let claimRole: string | null = null;
    let decodedEmail: string | null = null;

    if (process.env.ENABLE_MOCK_AUTH !== "false" && token in MOCK_TOKEN_UIDS) {
      uid = MOCK_TOKEN_UIDS[token];
      claimRole = uid === "mock-super-admin-1" ? "superAdmin" : null;
    } else {
      const decoded = verifyAccessToken(token);
      uid = decoded.uid;
      claimRole = normalizeRole(decoded.role);
    }

    if (claimRole !== "superAdmin") {
      const user = await prisma.user.findUnique({ where: { id: uid } });
      const firestoreRole = user ? normalizeRole(user.role) : null;
      decodedEmail = user?.email?.toLowerCase() ?? decodedEmail;

      const allowlist = getSuperAdminEmailAllowlist();
      const isAllowlisted = Boolean(decodedEmail && allowlist.has(decodedEmail));

      if (firestoreRole !== "superAdmin" && !isAllowlisted) {
        return res.status(403).json({ success: false, error: "Super admin access required" });
      }
    }

    req.uid = uid;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
