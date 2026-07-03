import { Router } from 'express';
import * as admin from 'firebase-admin';
import { requireAuth } from '../shared/authMiddleware';

const router = Router();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helper: calculate discount for a coupon against a cart
// ---------------------------------------------------------------------------
export async function computeCouponDiscount(
  db: admin.firestore.Firestore,
  uid: string,
  code: string,
  subTotal: number,
  businessId: string
): Promise<{ code: string; discountAmount: number; couponId: string }> {
  const snap = await db
    .collection('coupons')
    .where('code', '==', code.toUpperCase().trim())
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) throw new Error('Coupon not found or inactive');
  const coupon = snap.docs[0].data() as any;
  const couponId = snap.docs[0].id;

  // Expiry check
  if (coupon.expiresAt) {
    const expiresAt = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    if (expiresAt < new Date()) throw new Error('This coupon has expired');
  }

  // Business-specific check
  if (coupon.businessId && coupon.businessId !== businessId) {
    throw new Error('Coupon is not valid for this shop');
  }

  // Minimum order check
  if (coupon.minOrderAmount && subTotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order of Rs ${coupon.minOrderAmount} required for this coupon`);
  }

  // Global usage limit
  if (coupon.usageLimit && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  // Per-user limit
  if (coupon.perUserLimit) {
    const userUsageSnap = await db
      .collection('orders')
      .where('userId', '==', uid)
      .where('couponCode', '==', code.toUpperCase().trim())
      .get();
    if (userUsageSnap.size >= coupon.perUserLimit) {
      throw new Error('You have already used this coupon the maximum number of times');
    }
  }

  // Compute discount
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = Math.floor((subTotal * coupon.value) / 100);
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else if (coupon.type === 'flat') {
    discountAmount = Math.min(coupon.value, subTotal);
  }

  return { code: code.toUpperCase().trim(), discountAmount, couponId };
}

// ---------------------------------------------------------------------------
// POST /coupons/validate — check a coupon before placing order (auth required)
// ---------------------------------------------------------------------------
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { code, businessId, subTotal } = req.body;

    if (!code) return res.status(400).json({ success: false, error: 'code is required' });
    if (!businessId) return res.status(400).json({ success: false, error: 'businessId is required' });
    if (typeof subTotal !== 'number' || subTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Valid subTotal is required' });
    }

    const result = await computeCouponDiscount(db, uid, code, subTotal, businessId);
    return res.json({
      success: true,
      data: {
        code: result.code,
        discountAmount: result.discountAmount,
        finalTotal: subTotal - result.discountAmount,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /coupons — list active platform-wide coupons (for discovery)
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const snap = await db
      .collection('coupons')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const coupons = snap.docs.map((doc) => {
      const d = doc.data();
      // Only expose safe fields — no usage tracking internals
      return {
        id: doc.id,
        code: d.code,
        type: d.type,
        value: d.value,
        maxDiscount: d.maxDiscount ?? null,
        minOrderAmount: d.minOrderAmount ?? 0,
        description: d.description ?? null,
        expiresAt: d.expiresAt ?? null,
      };
    });

    return res.json({ success: true, data: coupons });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
