import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Mock token lookup — mirrors the mock users in the mobile app's useAuth.ts.
// Allows the dev mock login to work with these owner API routes without a
// real Firebase ID token. Remove this map once the real auth flow is active.
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

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  // Dev mock-token bypass
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
// Helper — find the business owned by the authenticated user
// ---------------------------------------------------------------------------
const getOwnerBusiness = async (uid: string) => {
  const snapshot = await db
    .collection('businesses')
    .where('ownerId', '==', uid)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// ---------------------------------------------------------------------------
// GET /owner/business — get the authenticated owner's business profile
// ---------------------------------------------------------------------------
router.get('/business', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);

    return res.json({ success: true, data: business });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/products — paginated products for the owner's business
// ---------------------------------------------------------------------------
router.get('/products', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const snapshot = await db
      .collection('products')
      .where('businessId', '==', (business as any).id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total: products.length,
        totalPages: Math.ceil(products.length / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/products — create a product for the owner's business
// ---------------------------------------------------------------------------
router.post('/products', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'No business found for this owner. Ask an admin to set up your business first.',
      });
    }

    const docRef = await db.collection('products').add({
      ...req.body,
      businessId: (business as any).id,
      status: req.body.status || 'active',
      rating: 0,
      totalReviews: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const newDoc = await docRef.get();
    return res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /owner/products/:id — update a product (must belong to owner's business)
// ---------------------------------------------------------------------------
router.put('/products/:id', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.status(404).json({ success: false, error: 'No business found for this owner' });
    }

    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (productDoc.data()?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Product does not belong to your business' });
    }

    const { businessId: _ignored, ...safeBody } = req.body; // prevent businessId override
    await db.collection('products').doc(req.params.id).update({
      ...safeBody,
      businessId: (business as any).id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await db.collection('products').doc(req.params.id).get();
    return res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /owner/products/:id — delete a product (must belong to owner's business)
// ---------------------------------------------------------------------------
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.status(404).json({ success: false, error: 'No business found for this owner' });
    }

    const productDoc = await db.collection('products').doc(req.params.id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (productDoc.data()?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Product does not belong to your business' });
    }

    await db.collection('products').doc(req.params.id).delete();
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/orders — paginated orders for the owner's business
// ---------------------------------------------------------------------------
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const snapshot = await db
      .collection('orders')
      .where('businessId', '==', (business as any).id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total: orders.length,
        totalPages: Math.ceil(orders.length / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/orders/:orderId/status — update an order's status
// ---------------------------------------------------------------------------
router.patch('/orders/:orderId/status', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const business = await getOwnerBusiness(uid);
    if (!business) {
      return res.status(404).json({ success: false, error: 'No business found for this owner' });
    }

    const orderDoc = await db.collection('orders').doc(req.params.orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (orderDoc.data()?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Order does not belong to your business' });
    }

    const trackingUpdate = { status, timestamp: new Date() };

    await db.collection('orders').doc(req.params.orderId).update({
      status,
      trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await db.collection('orders').doc(req.params.orderId).get();
    return res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/stats — dashboard statistics for the owner
// ---------------------------------------------------------------------------
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);

    if (!business) {
      return res.json({
        success: true,
        data: {
          totalProducts: 0,
          totalOrders: 0,
          pendingOrders: 0,
          lowStockProducts: 0,
          todayRevenue: 0,
        },
      });
    }

    const businessId = (business as any).id;

    const [productsSnap, ordersSnap, pendingOrdersSnap] = await Promise.all([
      db.collection('products').where('businessId', '==', businessId).get(),
      db.collection('orders').where('businessId', '==', businessId).get(),
      db
        .collection('orders')
        .where('businessId', '==', businessId)
        .where('status', '==', 'pending')
        .get(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayRevenue = 0;
    let lowStockProducts = 0;

    productsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.stock !== undefined && Number(data.stock) <= 5) {
        lowStockProducts++;
      }
    });

    ordersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'completed' || data.status === 'delivered') {
        const createdAt: Date | undefined = data.createdAt?.toDate?.();
        if (createdAt && createdAt >= today) {
          todayRevenue += Number(data.total) || 0;
        }
      }
    });

    return res.json({
      success: true,
      data: {
        totalProducts: productsSnap.size,
        totalOrders: ordersSnap.size,
        pendingOrders: pendingOrdersSnap.size,
        lowStockProducts,
        todayRevenue,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
