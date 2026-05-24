import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Mock token lookup (matches rest of codebase)
// ---------------------------------------------------------------------------
const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-access-token-superadmin': 'mock-super-admin-1',
  'mock-access-token-businessowner': 'mock-business-owner-1',
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
// GET /reviews — fetch approved reviews for a business or product
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { businessId, productId } = req.query;

    if (!businessId && !productId) {
      return res.status(400).json({ success: false, error: 'businessId or productId is required' });
    }

    let query: admin.firestore.Query = db
      .collection('reviews')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (businessId) {
      query = db
        .collection('reviews')
        .where('businessId', '==', businessId)
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(50);
    } else if (productId) {
      query = db
        .collection('reviews')
        .where('productId', '==', productId)
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(50);
    }

    const snapshot = await query.get();
    const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /reviews — submit a new review (auth required, must be verified buyer)
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { businessId, productId, orderId, rating, title, comment } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (!businessId && !productId) {
      return res.status(400).json({ success: false, error: 'businessId or productId is required' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'rating must be between 1 and 5' });
    }
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'comment must be at least 5 characters' });
    }

    // Verify the order belongs to this user and was delivered
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const orderData = orderDoc.data() as any;
    if (orderData.userId !== uid) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }
    if (orderData.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Can only review delivered orders' });
    }

    // Prevent duplicate review for same order+business/product
    const dupTarget = businessId
      ? db.collection('reviews').where('orderId', '==', orderId).where('businessId', '==', businessId)
      : db.collection('reviews').where('orderId', '==', orderId).where('productId', '==', productId);

    const dupSnap = await dupTarget.limit(1).get();
    if (!dupSnap.empty) {
      return res.status(409).json({ success: false, error: 'You have already reviewed this order' });
    }

    const reviewData: any = {
      userId: uid,
      orderId,
      rating,
      comment: comment.trim(),
      title: title?.trim() ?? null,
      verified: true,  // confirmed buyer
      helpful: 0,
      notHelpful: 0,
      status: 'approved',  // auto-approve for verified buyers
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (businessId) reviewData.businessId = businessId;
    if (productId) reviewData.productId = productId;

    const docRef = await db.collection('reviews').add(reviewData);

    // Update aggregate rating on business/product document
    if (businessId) {
      await updateAggregateRating(db, 'businesses', businessId);
    }
    if (productId) {
      await updateAggregateRating(db, 'products', productId);
    }

    return res.status(201).json({
      success: true,
      data: { id: docRef.id, ...reviewData },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Helper: recalculate + write average rating to parent document
// ---------------------------------------------------------------------------
async function updateAggregateRating(
  db: admin.firestore.Firestore,
  collection: 'businesses' | 'products',
  docId: string
) {
  const snap = await db
    .collection('reviews')
    .where(collection === 'businesses' ? 'businessId' : 'productId', '==', docId)
    .where('status', '==', 'approved')
    .get();

  if (snap.empty) return;

  const total = snap.docs.reduce((sum, d) => sum + ((d.data() as any).rating ?? 0), 0);
  const avg = Math.round((total / snap.size) * 10) / 10;

  await db.collection(collection).doc(docId).update({
    rating: avg,
    totalReviews: snap.size,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export default router;
