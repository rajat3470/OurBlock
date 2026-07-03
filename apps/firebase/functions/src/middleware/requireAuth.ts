import {Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";

const auth = admin.auth();

export const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({success: false, error: "No token provided"});
  if (token in MOCK_TOKEN_UIDS) {
    (req as any).uid = MOCK_TOKEN_UIDS[token];
    return next();
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({success: false, error: "Invalid or expired token"});
  }
};

export async function getAuthenticatedUid(req: any): Promise<string> {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    throw Object.assign(new Error("No token provided"), {statusCode: 401});
  }

  if (token in MOCK_TOKEN_UIDS) {
    return MOCK_TOKEN_UIDS[token];
  }

  const decodedToken = await auth.verifyIdToken(token);
  return decodedToken.uid;
}
