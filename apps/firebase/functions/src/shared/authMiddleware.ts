import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

const auth = admin.auth();
const db = admin.firestore();

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-access-token-superadmin': 'mock-super-admin-1',
  'mock-access-token-businessowner': 'mock-business-owner-1',
  'mock-access-token-user': 'mock-user-1',
};

function extractToken(req: Request): string | undefined {
  return req.headers.authorization?.split('Bearer ')[1];
}

function resolveMockUid(token: string): string | undefined {
  if (isEmulator && token in MOCK_TOKEN_UIDS) {
    return MOCK_TOKEN_UIDS[token];
  }
  return undefined;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const mockUid = resolveMockUid(token);
  if (mockUid) {
    (req as any).uid = mockUid;
    (req as any).user = { uid: mockUid };
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    (req as any).user = { uid: decoded.uid };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export function getAuthenticatedUid(req: Request): Promise<string> {
  const token = extractToken(req);

  if (!token) {
    throw Object.assign(new Error('No token provided'), { statusCode: 401 });
  }

  const mockUid = resolveMockUid(token);
  if (mockUid) return Promise.resolve(mockUid);

  return auth.verifyIdToken(token).then((decoded) => decoded.uid);
}

const SUPER_ADMIN_EMAIL_ALLOWLIST = new Set(
  (process.env.SUPER_ADMIN_EMAILS || 'ankushrishi5@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function normalizeRole(role: unknown): 'superAdmin' | 'businessOwner' | 'user' | null {
  if (typeof role !== 'string') return null;
  const compact = role.replace(/[-_\s]/g, '').toLowerCase();
  if (compact === 'superadmin') return 'superAdmin';
  if (compact === 'businessowner' || compact === 'owner' || compact === 'merchant') return 'businessOwner';
  if (compact === 'user' || compact === 'customer' || compact === 'resident') return 'user';
  return null;
}

export { normalizeRole };

export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

  try {
    let uid = '';
    let claimRole: 'superAdmin' | 'businessOwner' | 'user' | null = null;
    let decodedEmail: string | null = null;

    const mockUid = resolveMockUid(token);
    if (mockUid) {
      uid = mockUid;
      claimRole = uid === 'mock-super-admin-1' ? 'superAdmin' : null;
    } else {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      claimRole = normalizeRole((decoded as any)?.role);
      decodedEmail = typeof (decoded as any)?.email === 'string' ? (decoded as any).email.toLowerCase() : null;
    }

    if (claimRole !== 'superAdmin') {
      const userDoc = await db.collection('users').doc(uid).get();
      const firestoreRole = userDoc.exists ? normalizeRole((userDoc.data() as any)?.role) : null;
      const firestoreEmail = userDoc.exists && typeof (userDoc.data() as any)?.email === 'string'
        ? String((userDoc.data() as any).email).toLowerCase()
        : null;

      const isAllowlistedEmail = Boolean(
        (decodedEmail && SUPER_ADMIN_EMAIL_ALLOWLIST.has(decodedEmail)) ||
        (firestoreEmail && SUPER_ADMIN_EMAIL_ALLOWLIST.has(firestoreEmail))
      );

      if (firestoreRole !== 'superAdmin' && !isAllowlistedEmail) {
        return res.status(403).json({ success: false, error: 'Super admin access required' });
      }
    }

    (req as any).uid = uid;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
