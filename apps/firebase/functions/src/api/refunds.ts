import {Router, Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";
import {notifyUser} from "../utils/oneSignal";

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

const MOCK_TOKEN_UIDS: Record<string, string> = {
  "mock-access-token-superadmin": "mock-super-admin-1",
  "mock-access-token-businessowner": "mock-business-owner-1",
  "mock-access-token-user": "mock-user-1",
};

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

// Refund window: 48 hours after order was last updated to delivered
const REFUND_WINDOW_HOURS = 48;

// ---------------------------------------------------------------------------
// GET /refunds/my — list the authenticated user's refund requests
// ---------------------------------------------------------------------------
router.get("/my", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const snap = await db
      .collection("refunds")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const refunds = snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    return res.json({success: true, data: refunds});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

// ---------------------------------------------------------------------------
// POST /refunds — submit a refund request
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).uid;
    const {orderId, reason, comment} = req.body;

    if (!orderId) return res.status(400).json({success: false, error: "orderId is required"});
    if (!reason) return res.status(400).json({success: false, error: "reason is required"});

    const VALID_REASONS = ["wrong_item", "missing_item", "quality_issue", "damaged", "other"];
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({success: false, error: `reason must be one of: ${VALID_REASONS.join(", ")}`});
    }

    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({success: false, error: "comment must be at least 5 characters"});
    }

    // Verify order exists and belongs to the user
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) return res.status(404).json({success: false, error: "Order not found"});

    const orderData = orderDoc.data() as any;
    if (orderData.userId !== uid) return res.status(403).json({success: false, error: "Not your order"});
    if (orderData.status !== "delivered") {
      return res.status(400).json({success: false, error: "Refund requests are only allowed for delivered orders"});
    }

    // Check refund window
    if (orderData.updatedAt) {
      const updatedAt = orderData.updatedAt.toDate ? orderData.updatedAt.toDate() : new Date(orderData.updatedAt);
      const hoursElapsed = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > REFUND_WINDOW_HOURS) {
        return res.status(400).json({
          success: false,
          error: `Refund window has expired. Requests must be submitted within ${REFUND_WINDOW_HOURS} hours of delivery.`,
        });
      }
    }

    // Prevent duplicate refund for same order
    const dupSnap = await db.collection("refunds").where("orderId", "==", orderId).limit(1).get();
    if (!dupSnap.empty) {
      return res.status(409).json({success: false, error: "A refund request for this order already exists"});
    }

    const refundData = {
      orderId,
      userId: uid,
      businessId: orderData.businessId,
      businessName: orderData.businessName ?? "",
      orderAmount: orderData.finalAmount ?? orderData.totalAmount ?? 0,
      reason,
      comment: comment.trim(),
      status: "pending",
      refundAmount: 0, // set by business owner / admin on approval
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("refunds").add(refundData);

    // Tag the order so we know a refund was requested
    await db.collection("orders").doc(orderId).update({
      refundRequested: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify business owner about the refund request
    try {
      const businessDoc = await db.collection("businesses").doc(orderData.businessId).get();
      const ownerId = businessDoc.data()?.ownerId as string | undefined;
      if (ownerId) {
        const ownerDoc = await db.collection("users").doc(ownerId).get();
        const ownerPushToken = ownerDoc.data()?.pushToken as string | undefined;
        const orderRef = String(orderId).substring(0, 8).toUpperCase();
        void notifyUser(
          ownerId,
          "Refund requested",
          `Customer requested a refund for order #${orderRef}`,
          {type: "refund", orderId, refundId: docRef.id, status: "pending"},
          ownerPushToken
        );
      }
    } catch (notifyErr) {
      console.warn("[refunds] owner notify failed", notifyErr);
    }

    return res.status(201).json({success: true, data: {id: docRef.id, ...refundData}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

export default router;
