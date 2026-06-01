import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Mock tokens (dev only)
// ---------------------------------------------------------------------------
const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-access-token-user': 'mock-user-1',
};

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  if (token in MOCK_TOKEN_UIDS) {
    (req as any).uid = MOCK_TOKEN_UIDS[token];
    return next();
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// ---------------------------------------------------------------------------
// Constants — keep in sync with DEFAULT_FEATURE_FLAGS on the mobile client
// ---------------------------------------------------------------------------
const MAX_CLAIMS_PER_DAY = 1;
const REWARD_MIN_RS = 2;
const REWARD_MAX_RS = 5;

// ---------------------------------------------------------------------------
// POST /ads/claim-reward
// Issues a one-time coupon after a user watches a rewarded ad.
// ---------------------------------------------------------------------------
router.post('/claim-reward', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).uid as string;

  try {
    // Check daily claim limit per user
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const claimRef = db.collection('users').doc(uid).collection('adRewardClaims').doc(today);
    const claimSnap = await claimRef.get();
    const claimsToday: number = claimSnap.exists ? (claimSnap.data()?.count ?? 0) : 0;

    if (claimsToday >= MAX_CLAIMS_PER_DAY) {
      return res.status(429).json({
        success: false,
        error: 'Daily ad reward limit reached. Come back tomorrow!',
      });
    }

    // Generate a unique, user-scoped coupon code
    const code = `ADR-${uid.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Random reward amount within configured range
    const discountAmount =
      Math.floor(Math.random() * (REWARD_MAX_RS - REWARD_MIN_RS + 1)) + REWARD_MIN_RS;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // valid for 24h

    // Create a single-use coupon in Firestore
    await db.collection('coupons').add({
      code,
      type: 'fixed',
      value: discountAmount,
      minOrderAmount: 50,
      maxDiscount: discountAmount,
      usageLimit: 1,
      usageCount: 0,
      perUserLimit: 1,
      status: 'active',
      couponSource: 'rewarded_ad',
      forUserId: uid,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Increment daily claim counter
    await claimRef.set(
      {
        count: claimsToday + 1,
        lastClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      couponCode: code,
      discountAmount,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('claim-reward error:', err);
    return res.status(500).json({ success: false, error: 'Failed to issue reward. Try again.' });
  }
});

export default router;
