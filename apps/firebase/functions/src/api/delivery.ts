import {Router, Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";
import {isPaymentOutstanding} from "../shared/constants";

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
  "mock-access-token-deliverypartner": "mock-delivery-partner-1",
};

/** Orders the partner should see in their queue. */
const QUEUE_STATUS_LIST = ["confirmed", "preparing", "ready", "outForDelivery"] as const;
/** Orders the partner can start / complete. */
const ACTIONABLE_STATUSES = new Set(["ready", "outForDelivery"]);
/** Hard cap — keeps reads cheap even if a shop is busy. */
const DELIVERY_QUEUE_LIMIT = 40;

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

async function getDeliveryPartner(uid: string) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data() as any;
  if (data.role !== "deliveryPartner") return null;
  if (data.status === "suspended" || data.status === "inactive") return null;
  return {id: userDoc.id, ...data};
}

async function getBusinessSummary(businessId?: string, partner?: any) {
  // Prefer denormalized shop snapshot on the partner doc (0 extra reads).
  if (partner?.businessName) {
    return {
      id: businessId || partner.businessId,
      name: partner.businessName,
      address: partner.businessAddress ?? "",
      phone: partner.businessPhone ?? "",
      imageUrl: partner.businessImageUrl ?? null,
      category: partner.businessCategory ?? null,
    };
  }
  if (!businessId) return null;
  const doc = await db.collection("businesses").doc(businessId).get();
  if (!doc.exists) return null;
  const data = doc.data() as any;
  return {
    id: doc.id,
    name: data.name ?? "Shop",
    address: data.address ?? "",
    phone: data.phone ?? "",
    imageUrl: data.imageUrl ?? null,
    category: data.category ?? null,
  };
}

async function notifyCustomer(userId: string, title: string, body: string) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const pushToken = userDoc.data()?.pushToken as string | undefined;
    if (!pushToken?.startsWith("ExponentPushToken[")) return;
    const https = await import("https");
    const payload = JSON.stringify({to: pushToken, sound: "default", title, body, data: {}});
    await new Promise<void>((resolve) => {
      const req = https.request(
        {
          hostname: "exp.host",
          path: "/--/api/v2/push/send",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        () => resolve()
      );
      req.on("error", () => resolve());
      req.write(payload);
      req.end();
    });
  } catch {
    /* non-blocking */
  }
}

// ---------------------------------------------------------------------------
// GET /delivery/orders — active deliveries for the partner's linked shop
// ---------------------------------------------------------------------------
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const partner = await getDeliveryPartner((req as any).uid);
    if (!partner) {
      return res.status(403).json({success: false, error: "Delivery partner access required"});
    }
    if (!partner.businessId) {
      return res.status(400).json({
        success: false,
        error: "This delivery partner is not linked to a shop",
      });
    }

    // Indexed query: only queue statuses, newest first, hard-capped.
    // Avoids reading delivered/cancelled history (was up to 200 docs/request).
    const [snapshot, business] = await Promise.all([
      db
        .collection("orders")
        .where("businessId", "==", partner.businessId)
        .where("status", "in", [...QUEUE_STATUS_LIST])
        .orderBy("createdAt", "desc")
        .limit(DELIVERY_QUEUE_LIMIT)
        .get(),
      getBusinessSummary(partner.businessId, partner),
    ]);

    const orders = snapshot.docs
      .map((doc) => ({id: doc.id, ...doc.data()}))
      // Multi-partner shops: each rider only sees orders assigned to them.
      .filter((order: any) => order.assignedDeliveryPartnerId === partner.id);

    return res.json({
      success: true,
      data: orders,
      business,
      meta: {
        actionableCount: orders.filter((o: any) => ACTIONABLE_STATUSES.has(o.status)).length,
        total: orders.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// GET /delivery/orders/:id
// ---------------------------------------------------------------------------
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const partner = await getDeliveryPartner((req as any).uid);
    if (!partner) {
      return res.status(403).json({success: false, error: "Delivery partner access required"});
    }

    const doc = await db.collection("orders").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const data = doc.data()!;
    if (data.businessId !== partner.businessId) {
      return res.status(403).json({success: false, error: "Access denied"});
    }
    if (data.assignedDeliveryPartnerId && data.assignedDeliveryPartnerId !== partner.id) {
      return res.status(403).json({success: false, error: "This order is assigned to another partner"});
    }
    if (!data.assignedDeliveryPartnerId) {
      return res.status(403).json({
        success: false,
        error: "This order has not been assigned to you yet",
      });
    }

    return res.json({success: true, data: {id: doc.id, ...data}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// POST /delivery/orders/:id/start — mark out for delivery
// ---------------------------------------------------------------------------
router.post("/orders/:id/start", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const partner = await getDeliveryPartner(uid);
    if (!partner) {
      return res.status(403).json({success: false, error: "Delivery partner access required"});
    }

    const orderRef = db.collection("orders").doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const order = orderDoc.data()!;
    if (order.businessId !== partner.businessId) {
      return res.status(403).json({success: false, error: "Access denied"});
    }
    if (order.assignedDeliveryPartnerId !== partner.id) {
      return res.status(403).json({
        success: false,
        error: "This order is not assigned to you",
      });
    }
    if (order.status !== "ready" && order.status !== "outForDelivery") {
      return res.status(400).json({
        success: false,
        error: "Wait until the shop marks this order as Ready",
      });
    }

    if (order.status === "ready") {
      const trackingUpdate = {
        status: "outForDelivery",
        timestamp: new Date().toISOString(),
        notes: `Out for delivery by ${partner.firstName ?? "partner"}`,
      };
      await orderRef.update({
        status: "outForDelivery",
        trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      notifyCustomer(
        order.userId,
        "🚚 Out for Delivery",
        `${order.businessName || "Your order"} is on its way to you!`
      );
    }

    const updated = await orderRef.get();
    return res.json({success: true, data: {id: updated.id, ...updated.data()}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// POST /delivery/orders/:id/complete — photo proof + payment collection
// ---------------------------------------------------------------------------
router.post("/orders/:id/complete", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const partner = await getDeliveryPartner(uid);
    if (!partner) {
      return res.status(403).json({success: false, error: "Delivery partner access required"});
    }

    const {deliveryProofImageUrl, paymentCollectedMethod} = req.body ?? {};
    if (!deliveryProofImageUrl || typeof deliveryProofImageUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "deliveryProofImageUrl is required",
      });
    }

    const orderRef = db.collection("orders").doc(req.params.id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const order = orderDoc.data()!;
    if (order.businessId !== partner.businessId) {
      return res.status(403).json({success: false, error: "Access denied"});
    }
    if (order.assignedDeliveryPartnerId !== partner.id) {
      return res.status(403).json({
        success: false,
        error: "This order is not assigned to you",
      });
    }
    if (!ACTIONABLE_STATUSES.has(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Order is not ready for delivery completion yet",
      });
    }

    const outstanding = isPaymentOutstanding(order.paymentStatus);
    if (outstanding) {
      const method = paymentCollectedMethod as string | undefined;
      if (!method || !["cash", "upi", "card", "wallet"].includes(method)) {
        return res.status(400).json({
          success: false,
          error: "paymentCollectedMethod is required (cash, upi, or card) when payment is still pending",
        });
      }
    }

    const trackingUpdate = {
      status: "delivered",
      timestamp: new Date().toISOString(),
      notes: outstanding ?
        `Delivered & payment collected via ${paymentCollectedMethod}` :
        "Delivered (payment already completed)",
    };

    const update: Record<string, unknown> = {
      status: "delivered",
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      deliveredBy: uid,
      deliveryProofImageUrl,
      trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (outstanding) {
      update.paymentStatus = "completed";
      update.paymentCollectedAt = admin.firestore.FieldValue.serverTimestamp();
      update.paymentCollectedBy = uid;
      update.paymentCollectedMethod = paymentCollectedMethod;
      update.paymentMethod = paymentCollectedMethod;
    }

    await orderRef.update(update);
    notifyCustomer(
      order.userId,
      "✅ Order Delivered",
      `${order.businessName || "Your order"} has been delivered. Enjoy!`
    );

    const updated = await orderRef.get();
    return res.json({success: true, data: {id: updated.id, ...updated.data()}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// GET /delivery/me — partner profile + linked shop
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, async (req, res) => {
  try {
    const partner = await getDeliveryPartner((req as any).uid);
    if (!partner) {
      return res.status(403).json({success: false, error: "Delivery partner access required"});
    }
    const business = await getBusinessSummary(partner.businessId, partner);
    return res.json({
      success: true,
      data: {
        ...partner,
        business,
      },
    });
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

export default router;
