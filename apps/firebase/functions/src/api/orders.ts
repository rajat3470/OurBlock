import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PLATFORM_FEE = 2;    // Rs. 2 per order
const MINIMUM_ORDER = 50;  // Rs. 50 minimum subtotal

// ---------------------------------------------------------------------------
// Mock token lookup (matches owner.ts dev pattern)
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
// GET /orders/my — authenticated user's own orders
// ---------------------------------------------------------------------------
router.get('/my', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const snapshot = await db
      .collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit * page)
      .get();

    const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total: snapshot.size, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders/business — orders for the authenticated business owner
// ---------------------------------------------------------------------------
router.get('/business', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const bizSnap = await db.collection('businesses').where('ownerId', '==', uid).limit(1).get();
    if (bizSnap.empty) return res.status(404).json({ success: false, error: 'No business found' });

    const businessId = bizSnap.docs[0].id;
    const statusFilter = req.query.status as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let query: any = db.collection('orders').where('businessId', '==', businessId).orderBy('createdAt', 'desc');
    if (statusFilter) {
      query = db.collection('orders')
        .where('businessId', '==', businessId)
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.limit(limit * page).get();
    const all = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total: snapshot.size, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders/:id — single order (must belong to user or their business)
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });

    const data = doc.data()!;
    let allowed = data.userId === uid;
    if (!allowed) {
      const bizSnap = await db.collection('businesses').where('ownerId', '==', uid).limit(1).get();
      if (!bizSnap.empty && bizSnap.docs[0].id === data.businessId) allowed = true;
    }
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    return res.json({ success: true, data: { id: doc.id, ...data } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /orders — create a new order
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { businessId, items, deliveryAddress, notes, paymentMethod } = req.body;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'businessId and items are required' });
    }
    if (!deliveryAddress) {
      return res.status(400).json({ success: false, error: 'deliveryAddress is required' });
    }

    const bizDoc = await db.collection('businesses').doc(businessId).get();
    if (!bizDoc.exists) return res.status(404).json({ success: false, error: 'Business not found' });
    const business = { id: bizDoc.id, ...bizDoc.data() } as any;

    const validatedItems: any[] = [];
    let subTotal = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, error: `Invalid item: ${JSON.stringify(item)}` });
      }

      const productDoc = await db.collection('products').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
      }
      const product = productDoc.data()!;

      if (product.businessId !== businessId) {
        return res.status(400).json({ success: false, error: `Product does not belong to this business` });
      }

      const stock = Number(product.stock ?? 0);
      if (item.quantity > stock) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for "${product.name}". Available: ${stock}`,
        });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      subTotal += lineTotal;

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        productImage: product.imageUrls?.[0] ?? null,
        quantity: item.quantity,
        price: unitPrice,
        lineTotal,
      });
    }

    if (subTotal < MINIMUM_ORDER) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount is Rs. ${MINIMUM_ORDER}. Your subtotal is Rs. ${subTotal}.`,
      });
    }

    const platformFee = PLATFORM_FEE;
    const finalAmount = subTotal + platformFee;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() ?? {};

    const orderData = {
      userId: uid,
      userName: `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() || 'Customer',
      userPhone: userData.phone ?? '',
      businessId,
      businessName: business.name,
      items: validatedItems,
      subTotal,
      platformFee,
      totalAmount: finalAmount,
      finalAmount,
      deliveryAddress,
      status: 'pending',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      notes: notes ?? '',
      trackingUpdates: [
        { status: 'pending', timestamp: new Date().toISOString(), notes: 'Order placed' },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('orders').add(orderData);
    const newDoc = await docRef.get();

    return res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /orders/:id/status — advance order status (business owner or customer cancel)
// ---------------------------------------------------------------------------
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { status, notes } = req.body;

    if (!status) return res.status(400).json({ success: false, error: 'status is required' });

    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) return res.status(404).json({ success: false, error: 'Order not found' });

    const orderData = orderDoc.data()!;

    const bizSnap = await db.collection('businesses').where('ownerId', '==', uid).limit(1).get();
    const isOwner = !bizSnap.empty && bizSnap.docs[0].id === orderData.businessId;
    const isCustomer = orderData.userId === uid;

    if (!isOwner && !isCustomer) return res.status(403).json({ success: false, error: 'Access denied' });
    if (isCustomer && !isOwner && status !== 'cancelled') {
      return res.status(403).json({ success: false, error: 'Customers can only cancel orders' });
    }

    const trackingUpdate = { status, timestamp: new Date().toISOString(), notes: notes ?? '' };

    await db.collection('orders').doc(req.params.id).update({
      status,
      trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await db.collection('orders').doc(req.params.id).get();
    return res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /orders — list all orders (admin / filtered)
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  try {
    const { businessId, status, userId } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    let query: any = db.collection('orders').orderBy('createdAt', 'desc');
    if (businessId) query = db.collection('orders').where('businessId', '==', businessId).orderBy('createdAt', 'desc');
    else if (userId) query = db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc');
    else if (status) query = db.collection('orders').where('status', '==', status).orderBy('createdAt', 'desc');

    const snapshot = await query.limit(limit * page).get();
    const all = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total: snapshot.size, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
