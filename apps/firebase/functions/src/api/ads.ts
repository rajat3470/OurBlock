import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
const db = admin.firestore();

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
