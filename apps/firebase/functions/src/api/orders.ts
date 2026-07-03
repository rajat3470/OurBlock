import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as https from 'https';
import { computeCouponDiscount } from './coupons';
import { ORDER_FEES } from '../shared/constants';
import { requireAuth } from '../middleware/requireAuth';
import { docToJson, docsToJson, parsePagination } from '../utils/routeHelpers';

const router = Router();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Push notification helper (Expo Push API)
// ---------------------------------------------------------------------------
const STATUS_MESSAGES: Record<string, { title: string; body: (name?: string) => string }> = {
  confirmed:  { title: '✅ Order Confirmed', body: (n) => `${n || 'Your order'} has been confirmed and is being prepared.` },
  preparing:  { title: '👨‍🍳 Being Prepared', body: (n) => `${n || 'Your order'} is now being prepared.` },
  ready:      { title: '🎉 Ready for Pickup', body: (n) => `${n || 'Your order'} is ready! Delivery is on the way.` },
  out_for_delivery: { title: '🚚 Out for Delivery', body: (n) => `${n || 'Your order'} is on its way to you!` },
  delivered:  { title: '✅ Order Delivered', body: (n) => `${n || 'Your order'} has been delivered. Enjoy your order!` },
  cancelled:  { title: '❌ Order Cancelled', body: (n) => `${n || 'Your order'} has been cancelled.` },
};

async function sendPushNotification(pushToken: string, title: string, body: string): Promise<void> {
  if (!pushToken.startsWith('ExponentPushToken[')) return;
  const payload = JSON.stringify({
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: {},
  });
  return new Promise((resolve) => {
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, () => resolve());
    req.on('error', () => resolve()); // non-blocking; ignore errors
    req.write(payload);
    req.end();
  });
}

async function notifyOrderStatusChange(
  userId: string,
  status: string,
  orderNote?: string
): Promise<void> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const pushToken = userDoc.data()?.pushToken;
    if (!pushToken) return;
    const msg = STATUS_MESSAGES[status];
    if (!msg) return;
    await sendPushNotification(pushToken, msg.title, msg.body(orderNote));
  } catch { /* non-blocking */ }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const { PLATFORM_FEE, MINIMUM_ORDER } = ORDER_FEES;

// ---------------------------------------------------------------------------
// GET /orders/my — authenticated user's own orders
// ---------------------------------------------------------------------------
router.get('/my', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 50 });

    const snapshot = await db
      .collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit * page)
      .get();

    const all = docsToJson(snapshot);
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
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 50 });

    let query: any = db.collection('orders').where('businessId', '==', businessId).orderBy('createdAt', 'desc');
    if (statusFilter) {
      query = db.collection('orders')
        .where('businessId', '==', businessId)
        .where('status', '==', statusFilter)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.limit(limit * page).get();
    const all = docsToJson(snapshot);
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
    const orderDoc = await db.collection('orders').doc(req.params.id).get();
    if (!orderDoc.exists) return res.status(404).json({ success: false, error: 'Order not found' });

    const data = orderDoc.data()!;
    let allowed = data.userId === uid;
    if (!allowed) {
      const bizSnap = await db.collection('businesses').where('ownerId', '==', uid).limit(1).get();
      if (!bizSnap.empty && bizSnap.docs[0].id === data.businessId) allowed = true;
    }
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    return res.json({ success: true, data: docToJson(orderDoc) });
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
    const { businessId, items, deliveryAddress, notes, paymentMethod, couponCode } = req.body;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'businessId and items are required' });
    }
    if (!deliveryAddress) {
      return res.status(400).json({ success: false, error: 'deliveryAddress is required' });
    }

    const bizDoc = await db.collection('businesses').doc(businessId).get();
    if (!bizDoc.exists) return res.status(404).json({ success: false, error: 'Business not found' });
    const business = { id: bizDoc.id, ...bizDoc.data() } as any;

    // Check business is accepting orders
    if (business.isTakingOrders === false) {
      return res.status(400).json({ success: false, error: `${business.name} is not accepting orders right now. Please try again later.` });
    }

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

    // Use per-business minimum order amount if set, otherwise fall back to global
    const effectiveMinimum = Number(business.minimumOrderAmount ?? MINIMUM_ORDER);
    if (subTotal < effectiveMinimum) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount is Rs. ${effectiveMinimum}. Your subtotal is Rs. ${subTotal}.`,
      });
    }

    const platformFee = PLATFORM_FEE;
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      try {
        const couponResult = await computeCouponDiscount(db, uid, couponCode, subTotal, businessId);
        couponDiscount = couponResult.discountAmount;
        appliedCouponCode = couponResult.code;
        // Increment coupon usage count
        const snap = await db.collection('coupons').where('code', '==', couponResult.code).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ usageCount: admin.firestore.FieldValue.increment(1) });
        }
      } catch {
        // Coupon validation failed — proceed without discount
      }
    }
    const finalAmount = subTotal + platformFee - couponDiscount;

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
      couponCode: appliedCouponCode,
      couponDiscount,
      totalAmount: finalAmount,
      finalAmount,
      deliveryAddress,
      status: 'pending',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: (paymentMethod === 'cash' || !paymentMethod) ? 'cod' : 'pending',
      notes: notes ?? '',
      trackingUpdates: [
        { status: 'pending', timestamp: new Date().toISOString(), notes: 'Order placed' },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('orders').add(orderData);
    const newDoc = await docRef.get();

    return res.status(201).json({ success: true, data: docToJson(newDoc) });
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

    // Fire-and-forget push notification to the customer
    notifyOrderStatusChange(orderData.userId, status, orderData.businessName ?? undefined);

    return res.json({ success: true, data: docToJson(updatedDoc) });
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
    const { page, limit } = parsePagination(req.query, { limit: 30 });

    let query: any = db.collection('orders').orderBy('createdAt', 'desc');
    if (businessId) query = db.collection('orders').where('businessId', '==', businessId).orderBy('createdAt', 'desc');
    else if (userId) query = db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc');
    else if (status) query = db.collection('orders').where('status', '==', status).orderBy('createdAt', 'desc');

    const snapshot = await query.limit(limit * page).get();
    const all = docsToJson(snapshot);
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total: snapshot.size, page, limit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
