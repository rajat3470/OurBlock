import {Router} from "express";
import * as admin from "firebase-admin";

const router = Router();
const db = admin.firestore();

// Get products — only verified products are returned to users
router.get("/", async (req, res) => {
  try {
    const {businessId, category, status = "active"} = req.query;

    let query: admin.firestore.Query = db
      .collection("products")
      .where("status", "==", status);

    if (businessId) {
      query = query.where("businessId", "==", businessId);
    }

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    const products = snapshot.docs
      .map((doc) => ({id: doc.id, ...doc.data()}))
      .filter((product: any) => product.isVerified === true || product.approvalStatus === "approved");

    res.json({success: true, data: products});
  } catch (error: any) {
    res.status(500).json({success: false, error: error.message});
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("products").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({success: false, error: "Product not found"});
    }
    return res.json({success: true, data: {id: doc.id, ...doc.data()}});
  } catch (error: any) {
    return res.status(500).json({success: false, error: error.message});
  }
});

router.post("/", async (req, res) => {
  try {
    const docRef = await db.collection("products").add({
      ...req.body,
      status: "active",
      rating: 0,
      totalReviews: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const newDoc = await docRef.get();
    res.status(201).json({success: true, data: {id: newDoc.id, ...newDoc.data()}});
  } catch (error: any) {
    res.status(400).json({success: false, error: error.message});
  }
});

router.put("/:id", async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updatedDoc = await db.collection("products").doc(req.params.id).get();
    res.json({success: true, data: {id: updatedDoc.id, ...updatedDoc.data()}});
  } catch (error: any) {
    res.status(400).json({success: false, error: error.message});
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).delete();
    res.json({success: true, message: "Product deleted successfully"});
  } catch (error: any) {
    res.status(500).json({success: false, error: error.message});
  }
});

export default router;
