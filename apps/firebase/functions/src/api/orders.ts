import {Router, Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";
import {computeCouponDiscount} from "./coupons";
import {
  ORDER_FEES,
  ORDER_ACCEPTANCE_WINDOW_SECONDS,
  isPaymentOutstanding,
} from "../shared/constants";
import {autoRejectIfExpired, isExpiredPending} from "../shared/orderExpiry";
import {notifyUser} from "../utils/oneSignal";

/**
 * Apply lazy auto-rejection to a page of order docs: any order still pending
 * past its deadline is rejected on read so clients never see a stale pending
 * status while waiting for the 1-minute sweeper.
 */
async function expirePendingDocs(
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<Array<{ id: string } & FirebaseFirestore.DocumentData>> {
  return Promise.all(
    docs.map(async (doc) => {
      const data = doc.data();
      if (!isExpiredPending(data)) return {id: doc.id, ...data};
      const {data: effective} = await autoRejectIfExpired(db, doc.ref, data);
      return {id: doc.id, ...effective};
    })
  );
}

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Push notification helper (Expo Push API)
// ---------------------------------------------------------------------------
const STATUS_MESSAGES: Record<string, { title: string; body: (name?: string) => string }> = {
  confirmed: {title: "✅ Order Confirmed", body: (n) => `${n || "Your order"} has been confirmed and is being prepared.`},
  preparing: {title: "👨‍🍳 Being Prepared", body: (n) => `${n || "Your order"} is now being prepared.`},
  ready: {title: "🎉 Ready for Pickup", body: (n) => `${n || "Your order"} is ready! Delivery is on the way.`},
  outForDelivery: {title: "🚚 Out for Delivery", body: (n) => `${n || "Your order"} is on its way to you!`},
  delivered: {title: "✅ Order Delivered", body: (n) => `${n || "Your order"} has been delivered. Enjoy your order!`},
  cancelled: {title: "❌ Order Cancelled", body: (n) => `${n || "Your order"} has been cancelled.`},
};

async function notifyOrderStatusChange(
  userId: string,
  status: string,
  orderNote?: string
): Promise<void> {
  try {
    const msg = STATUS_MESSAGES[status];
    if (!msg) return;
    const userDoc = await db.collection("users").doc(userId).get();
    const pushToken = userDoc.data()?.pushToken as string | undefined;
    // Primary path is Firestore onOrderUpdate → OneSignal; this is a safety net.
    await notifyUser(userId, msg.title, msg.body(orderNote), {status}, pushToken);
  } catch {/* non-blocking */}
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const {PLATFORM_FEE, MINIMUM_ORDER} = ORDER_FEES;

// ---------------------------------------------------------------------------
// Mock token lookup (matches owner.ts dev pattern)
// ---------------------------------------------------------------------------
const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
};

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
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

// ---------------------------------------------------------------------------
// GET /orders/my — authenticated user's own orders
// ---------------------------------------------------------------------------
router.get("/my", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const snapshot = await db
      .collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limit * page)
      .get();

    const all = await expirePendingDocs(snapshot.docs);
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({success: true, data: paginated, total: snapshot.size, page, limit});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// GET /orders/business — orders for the authenticated business owner
// ---------------------------------------------------------------------------
router.get("/business", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const bizSnap = await db.collection("businesses").where("ownerId", "==", uid).limit(1).get();
    if (bizSnap.empty) return res.status(404).json({success: false, error: "No business found"});

    const businessId = bizSnap.docs[0].id;
    const statusFilter = req.query.status as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let query: any = db.collection("orders").where("businessId", "==", businessId).orderBy("createdAt", "desc");
    if (statusFilter) {
      query = db.collection("orders")
        .where("businessId", "==", businessId)
        .where("status", "==", statusFilter)
        .orderBy("createdAt", "desc");
    }

    const snapshot = await query.limit(limit * page).get();
    const all = await expirePendingDocs(snapshot.docs);
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({success: true, data: paginated, total: snapshot.size, page, limit});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// GET /orders/:id — single order (must belong to user or their business)
// ---------------------------------------------------------------------------
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const doc = await db.collection("orders").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const data = doc.data()!;
    let allowed = data.userId === uid;
    if (!allowed) {
      const bizSnap = await db.collection("businesses").where("ownerId", "==", uid).limit(1).get();
      if (!bizSnap.empty && bizSnap.docs[0].id === data.businessId) allowed = true;
    }
    if (!allowed) return res.status(403).json({success: false, error: "Access denied"});

    const {data: effective} = await autoRejectIfExpired(db, doc.ref, data);
    return res.json({success: true, data: {id: doc.id, ...effective}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// POST /orders — create a new order
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const {
      businessId,
      items,
      deliveryAddress,
      notes,
      paymentMethod,
      paymentTiming: requestedTiming,
      couponCode,
    } = req.body;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({success: false, error: "businessId and items are required"});
    }
    if (!deliveryAddress) {
      return res.status(400).json({success: false, error: "deliveryAddress is required"});
    }

    const bizDoc = await db.collection("businesses").doc(businessId).get();
    if (!bizDoc.exists) return res.status(404).json({success: false, error: "Business not found"});
    const business = {id: bizDoc.id, ...bizDoc.data()} as any;

    // Check business is accepting orders
    if (business.isTakingOrders === false) {
      return res.status(400).json({success: false, error: `${business.name} is not accepting orders right now. Please try again later.`});
    }

    const validatedItems: any[] = [];
    let subTotal = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({success: false, error: `Invalid item: ${JSON.stringify(item)}`});
      }

      const productDoc = await db.collection("products").doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(404).json({success: false, error: `Product ${item.productId} not found`});
      }
      const product = productDoc.data()!;

      if (product.businessId !== businessId) {
        return res.status(400).json({success: false, error: "Product does not belong to this business"});
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
        const snap = await db.collection("coupons").where("code", "==", couponResult.code).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({usageCount: admin.firestore.FieldValue.increment(1)});
        }
      } catch {
        // Coupon validation failed — proceed without discount
      }
    }
    const finalAmount = subTotal + platformFee - couponDiscount;

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data() ?? {};

    const orderData = {
      userId: uid,
      userName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() || "Customer",
      userPhone: userData.phone ?? "",
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
      status: "pending",
      paymentMethod: paymentMethod || "cash",
      // Cash is always collected at delivery. Online methods may be prepaid at
      // checkout (atOrder) or collected on handoff (atDelivery) via UPI/card/cash.
      paymentTiming: (() => {
        const method = paymentMethod || "cash";
        if (method === "cash") return "atDelivery";
        if (requestedTiming === "atOrder" || requestedTiming === "atDelivery") {
          return requestedTiming;
        }
        return "atOrder";
      })(),
      paymentStatus: (() => {
        const method = paymentMethod || "cash";
        if (method === "cash") return "cod";
        const timing =
          requestedTiming === "atDelivery" || requestedTiming === "atOrder" ?
            requestedTiming :
            "atOrder";
        // Prepaid online (no live gateway yet) — treat as completed at order time.
        if (timing === "atOrder") return "completed";
        return "pending";
      })(),
      notes: notes ?? "",
      trackingUpdates: [
        {status: "pending", timestamp: new Date().toISOString(), notes: "Order placed"},
      ],
      // Owner acceptance deadline — auto-rejected by autoRejectExpiredOrders if
      // still pending past this instant. Anchored to the real creation time.
      acceptanceWindowSeconds: ORDER_ACCEPTANCE_WINDOW_SECONDS,
      autoRejectAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + ORDER_ACCEPTANCE_WINDOW_SECONDS * 1000
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const quantitiesByProduct = new Map<string, number>();
    validatedItems.forEach((item) => {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + Number(item.quantity)
      );
    });

    const docRef = db.collection("orders").doc();
    await db.runTransaction(async (transaction) => {
      for (const [productId, requestedQuantity] of quantitiesByProduct) {
        const productRef = db.collection("products").doc(productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          const stockError: any = new Error(`Product ${productId} not found`);
          stockError.statusCode = 404;
          throw stockError;
        }

        const product = productDoc.data()!;
        const availableStock = Number(product.stock ?? 0);
        if (!Number.isFinite(availableStock) || availableStock < requestedQuantity) {
          const stockError: any = new Error(
            `Insufficient stock for "${product.name}". Available: ${Math.max(0, availableStock)}`
          );
          stockError.statusCode = 400;
          throw stockError;
        }

        transaction.update(productRef, {
          stock: availableStock - requestedQuantity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      transaction.create(docRef, orderData);
    });

    const newDoc = await docRef.get();
    return res.status(201).json({success: true, data: {id: newDoc.id, ...newDoc.data()}});
  } catch (error: any) {
    return res.status(error.statusCode ?? 500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// PUT /orders/:id/status — advance order status (business owner or customer cancel)
// ---------------------------------------------------------------------------
router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const {
      status,
      notes,
      paymentCollectedMethod,
      deliveryProofImageUrl,
      deliveryPartnerId,
    } = req.body;

    if (!status) return res.status(400).json({success: false, error: "status is required"});

    const orderDoc = await db.collection("orders").doc(req.params.id).get();
    if (!orderDoc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const orderData = orderDoc.data()!;

    const bizSnap = await db.collection("businesses").where("ownerId", "==", uid).limit(1).get();
    const isOwner = !bizSnap.empty && bizSnap.docs[0].id === orderData.businessId;
    const isCustomer = orderData.userId === uid;

    if (!isOwner && !isCustomer) return res.status(403).json({success: false, error: "Access denied"});
    if (isCustomer && !isOwner && status !== "cancelled") {
      return res.status(403).json({success: false, error: "Customers can only cancel orders"});
    }

    const trackingUpdate = {status, timestamp: new Date().toISOString(), notes: notes ?? ""};
    const orderRef = db.collection("orders").doc(req.params.id);
    const deliveryPaymentFields: Record<string, unknown> = {};
    const assignmentFields: Record<string, unknown> = {};

    // Sending out for delivery requires a delivery partner assignment.
    if (status === "outForDelivery" && isOwner) {
      let assignedId = orderData.assignedDeliveryPartnerId as string | undefined;
      let assignedName = orderData.assignedDeliveryPartnerName as string | undefined;

      if (deliveryPartnerId) {
        const partnerDoc = await db.collection("users").doc(String(deliveryPartnerId)).get();
        if (!partnerDoc.exists) {
          return res.status(404).json({success: false, error: "Delivery partner not found"});
        }
        const partner = partnerDoc.data()!;
        if (
          partner.role !== "deliveryPartner" ||
          partner.businessId !== orderData.businessId ||
          partner.status !== "active"
        ) {
          return res.status(400).json({
            success: false,
            error: "Choose an active delivery partner for this shop",
          });
        }
        assignedId = partnerDoc.id;
        assignedName = `${partner.firstName ?? ""} ${partner.lastName ?? ""}`.trim() || "Delivery partner";
        assignmentFields.assignedDeliveryPartnerId = assignedId;
        assignmentFields.assignedDeliveryPartnerName = assignedName;
        assignmentFields.assignedAt = admin.firestore.FieldValue.serverTimestamp();
        trackingUpdate.notes =
          notes || `Out for delivery · assigned to ${assignedName}`;
      }

      if (!assignedId) {
        return res.status(400).json({
          success: false,
          error: "Select a delivery partner before marking Out for Delivery",
          code: "DELIVERY_PARTNER_REQUIRED",
        });
      }
    }

    if (status === "delivered" && isOwner) {
      deliveryPaymentFields.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
      deliveryPaymentFields.deliveredBy = uid;
      if (typeof deliveryProofImageUrl === "string" && deliveryProofImageUrl) {
        deliveryPaymentFields.deliveryProofImageUrl = deliveryProofImageUrl;
      }
      if (isPaymentOutstanding(orderData.paymentStatus)) {
        const method =
          (["cash", "upi", "card", "wallet"].includes(paymentCollectedMethod) ?
            paymentCollectedMethod :
            orderData.paymentMethod) || "cash";
        deliveryPaymentFields.paymentStatus = "completed";
        deliveryPaymentFields.paymentCollectedAt = admin.firestore.FieldValue.serverTimestamp();
        deliveryPaymentFields.paymentCollectedBy = uid;
        deliveryPaymentFields.paymentCollectedMethod = method;
        deliveryPaymentFields.paymentMethod = method;
      }
    }

    // When an owner accepts a still-pending order, do it in a transaction so it
    // cannot race with the auto-reject sweeper. If the acceptance window has
    // already lapsed (or the sweeper won), fail cleanly with 409 instead of
    // resurrecting an order the customer has been told was rejected.
    const isOwnerAcceptance =
      isOwner && orderData.status === "pending" && status !== "cancelled" && status !== "rejected";

    if (isOwnerAcceptance) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(orderRef);
          const data = fresh.data();
          if (!data || data.status !== "pending") {
            throw new Error("ORDER_NOT_PENDING");
          }
          const deadlineMs = data.autoRejectAt?.toMillis?.();
          if (deadlineMs !== undefined && Date.now() > deadlineMs) {
            throw new Error("ACCEPTANCE_WINDOW_EXPIRED");
          }
          tx.update(orderRef, {
            status,
            trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (txErr: any) {
        if (txErr?.message === "ACCEPTANCE_WINDOW_EXPIRED") {
          return res.status(409).json({
            success: false,
            error: "This order expired and was auto-rejected because it was not accepted within 60 seconds.",
            code: "ACCEPTANCE_WINDOW_EXPIRED",
          });
        }
        if (txErr?.message === "ORDER_NOT_PENDING") {
          return res.status(409).json({
            success: false,
            error: "This order can no longer be accepted (it is no longer pending).",
            code: "ORDER_NOT_PENDING",
          });
        }
        throw txErr;
      }
    } else {
      await orderRef.update({
        status,
        trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...deliveryPaymentFields,
        ...assignmentFields,
      });
    }

    const updatedDoc = await orderRef.get();

    // Fire-and-forget push notification to the customer
    notifyOrderStatusChange(orderData.userId, status, orderData.businessName ?? undefined);

    return res.json({success: true, data: {id: updatedDoc.id, ...updatedDoc.data()}});
  } catch (error: any) {
    return res.status(400).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// GET /orders — list all orders (admin / filtered)
// ---------------------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const {businessId, status, userId} = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    let query: any = db.collection("orders").orderBy("createdAt", "desc");
    if (businessId) query = db.collection("orders").where("businessId", "==", businessId).orderBy("createdAt", "desc");
    else if (userId) query = db.collection("orders").where("userId", "==", userId).orderBy("createdAt", "desc");
    else if (status) query = db.collection("orders").where("status", "==", status).orderBy("createdAt", "desc");

    const snapshot = await query.limit(limit * page).get();
    const all = snapshot.docs.map((doc: any) => ({id: doc.id, ...doc.data()}));
    const paginated = all.slice((page - 1) * limit, page * limit);

    return res.json({success: true, data: paginated, total: snapshot.size, page, limit});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

export default router;
