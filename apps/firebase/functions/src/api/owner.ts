import { Router, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { autoRejectIfExpired, isExpiredPending } from '../shared/orderExpiry';

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

    // Block product creation if business is not verified
    if (!(business as any).isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Your business must be verified by an admin before you can add products.',
      });
    }

    const docRef = await db.collection('products').add({
      ...req.body,
      businessId: (business as any).id,
      status: 'inactive',          // not live until approved
      isVerified: false,
      approvalStatus: 'pending',   // requires admin approval
      approvalNote: null,
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

    const orders = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        if (!isExpiredPending(data)) return { id: doc.id, ...data };
        const { data: effective } = await autoRejectIfExpired(db, doc.ref, data);
        return { id: doc.id, ...effective };
      })
    );

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

    const orderData = orderDoc.data();
    if (orderData?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Order does not belong to your business' });
    }

    const trackingUpdate = { status, timestamp: new Date() };
    const orderRef = db.collection('orders').doc(req.params.orderId);

    // Accepting a still-pending order must respect the 60s acceptance window and
    // cannot race with the auto-reject sweeper — do it transactionally.
    const isAcceptance = orderData?.status === 'pending' && status !== 'cancelled' && status !== 'rejected';
    if (isAcceptance) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(orderRef);
          const data = fresh.data();
          if (!data || data.status !== 'pending') throw new Error('ORDER_NOT_PENDING');
          const deadlineMs = data.autoRejectAt?.toMillis?.();
          if (deadlineMs !== undefined && Date.now() > deadlineMs) throw new Error('ACCEPTANCE_WINDOW_EXPIRED');
          tx.update(orderRef, {
            status,
            trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (txErr: any) {
        if (txErr?.message === 'ACCEPTANCE_WINDOW_EXPIRED') {
          return res.status(409).json({
            success: false,
            error: 'This order expired and was auto-rejected because it was not accepted within 60 seconds.',
            code: 'ACCEPTANCE_WINDOW_EXPIRED',
          });
        }
        if (txErr?.message === 'ORDER_NOT_PENDING') {
          return res.status(409).json({
            success: false,
            error: 'This order can no longer be accepted (it is no longer pending).',
            code: 'ORDER_NOT_PENDING',
          });
        }
        throw txErr;
      }
    } else {
      await orderRef.update({
        status,
        trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const updatedDoc = await orderRef.get();
    return res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/orders/:orderId/reject — reject an order with reason
// ---------------------------------------------------------------------------
router.post('/orders/:orderId/reject', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const business = await getOwnerBusiness(uid);
    if (!business) {
      return res.status(404).json({ success: false, error: 'No business found for this owner' });
    }

    const orderDoc = await db.collection('orders').doc(req.params.orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    if (orderData?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Order does not belong to your business' });
    }

    // Only allow rejection of PENDING orders
    if (orderData?.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot reject order with status "${orderData?.status}". Only pending orders can be rejected.` 
      });
    }

    const trackingUpdate = {
      status: 'rejected',
      timestamp: new Date().toISOString(),
      rejectionReason: reason.trim(),
      rejectedBy: 'business_owner',
      notes: `Order rejected by ${(business as any).name}: ${reason}`,
    };

    await db.collection('orders').doc(req.params.orderId).update({
      status: 'rejected',
      rejectionReason: reason.trim(),
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
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
// PATCH /owner/business/taking-orders — toggle isTakingOrders
// ---------------------------------------------------------------------------
router.patch('/business/taking-orders', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { isTakingOrders } = req.body;
    if (typeof isTakingOrders !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isTakingOrders must be a boolean' });
    }
    const business = await getOwnerBusiness(uid);
    if (!business) return res.status(404).json({ success: false, error: 'No business found' });

    await db.collection('businesses').doc((business as any).id).update({
      isTakingOrders,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ success: true, data: { isTakingOrders } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/business/settings — update operational settings
// ---------------------------------------------------------------------------
router.patch('/business/settings', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { minimumOrderAmount, estimatedDeliveryTime, preparationTime, deliveryFee, tags } = req.body;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.status(404).json({ success: false, error: 'No business found' });

    const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (minimumOrderAmount !== undefined) updates.minimumOrderAmount = Number(minimumOrderAmount);
    if (estimatedDeliveryTime !== undefined) updates.estimatedDeliveryTime = String(estimatedDeliveryTime);
    if (preparationTime !== undefined) updates.preparationTime = String(preparationTime);
    if (deliveryFee !== undefined) updates.deliveryFee = Number(deliveryFee);
    if (Array.isArray(tags)) updates.tags = tags.map(String);

    await db.collection('businesses').doc((business as any).id).update(updates);
    const updated = await db.collection('businesses').doc((business as any).id).get();
    return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /owner/business/image — update shop / banner image
// ---------------------------------------------------------------------------
router.patch('/business/image', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { imageUrl, bannerUrl } = req.body;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.status(404).json({ success: false, error: 'No business found' });

    const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof imageUrl === 'string') updates.imageUrl = imageUrl.trim() || null;
    if (typeof bannerUrl === 'string') updates.bannerUrl = bannerUrl.trim() || null;
    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ success: false, error: 'imageUrl or bannerUrl is required' });
    }

    await db.collection('businesses').doc((business as any).id).update(updates);
    const updated = await db.collection('businesses').doc((business as any).id).get();
    return res.json({ success: true, data: { id: updated.id, ...updated.data() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /owner/analytics — revenue (last 7 days) + popular items
// ---------------------------------------------------------------------------
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.json({ success: true, data: { daily: [], popularItems: [], totalRevenue7d: 0 } });

    const businessId = (business as any).id;

    // Last 30 days of delivered orders
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const snapshot = await db
      .collection('orders')
      .where('businessId', '==', businessId)
      .where('status', '==', 'delivered')
      .get();

    // Build day buckets for last 7 days
    const days: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, revenue: 0, orders: 0 };
    }

    // Tally popular items
    const itemCounts: Record<string, { productId: string; name: string; count: number; revenue: number }> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt: Date | undefined = data.createdAt?.toDate?.() ?? (data.createdAt ? new Date(data.createdAt) : undefined);
      if (!createdAt) return;

      const key = createdAt.toISOString().slice(0, 10);
      if (days[key]) {
        days[key].revenue += Number(data.finalAmount ?? data.totalAmount ?? 0);
        days[key].orders += 1;
      }

      (data.items || []).forEach((item: any) => {
        const pid = item.productId;
        if (!pid) return;
        if (!itemCounts[pid]) itemCounts[pid] = { productId: pid, name: item.productName ?? pid, count: 0, revenue: 0 };
        itemCounts[pid].count += Number(item.quantity ?? 1);
        itemCounts[pid].revenue += Number(item.lineTotal ?? 0);
      });
    });

    const popularItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const daily = Object.values(days);
    const totalRevenue7d = daily.reduce((sum, d) => sum + d.revenue, 0);

    return res.json({ success: true, data: { daily, popularItems, totalRevenue7d } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /owner/coupons — create a coupon scoped to this business
// ---------------------------------------------------------------------------
router.post('/coupons', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.status(404).json({ success: false, error: 'No business found' });

    const { code, type, value, minOrderAmount, maxDiscount, expiresAt, usageLimit, description } = req.body;
    if (!code || !type || !value) {
      return res.status(400).json({ success: false, error: 'code, type, and value are required' });
    }
    if (!['percentage', 'flat'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be percentage or flat' });
    }

    // Ensure code is unique
    const existing = await db.collection('coupons').where('code', '==', code.toUpperCase()).limit(1).get();
    if (!existing.empty) return res.status(400).json({ success: false, error: 'Coupon code already exists' });

    const docRef = await db.collection('coupons').add({
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      businessId: (business as any).id,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      usageCount: 0,
      perUserLimit: 1,
      description: description ?? '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'active',
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
// GET /owner/coupons — list this business's coupons
// ---------------------------------------------------------------------------
router.get('/coupons', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.json({ success: true, data: [] });

    const snap = await db
      .collection('coupons')
      .where('businessId', '==', (business as any).id)
      .orderBy('createdAt', 'desc')
      .get();

    const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: coupons });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /owner/coupons/:id — deactivate / delete a coupon
// ---------------------------------------------------------------------------
router.delete('/coupons/:id', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const business = await getOwnerBusiness(uid);
    if (!business) return res.status(404).json({ success: false, error: 'No business found' });

    const couponDoc = await db.collection('coupons').doc(req.params.id).get();
    if (!couponDoc.exists) return res.status(404).json({ success: false, error: 'Coupon not found' });
    if (couponDoc.data()?.businessId !== (business as any).id) {
      return res.status(403).json({ success: false, error: 'Coupon does not belong to your business' });
    }

    await db.collection('coupons').doc(req.params.id).update({
      status: 'inactive',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ success: true, message: 'Coupon deactivated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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
