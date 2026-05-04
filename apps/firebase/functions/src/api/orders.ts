import { Router } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

// Get orders
router.get('/', async (req, res) => {
  try {
    const { userId, businessId, status } = req.query;
    
    let query: any = db.collection('orders');
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (businessId) {
      query = query.where('businessId', '==', businessId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const docRef = await db.collection('orders').add({
      ...req.body,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const newDoc = await docRef.get();
    res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const trackingUpdate = {
      status,
      timestamp: new Date(),
      notes,
    };
    
    await db.collection('orders').doc(req.params.id).update({
      status,
      trackingUpdates: admin.firestore.FieldValue.arrayUnion(trackingUpdate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updatedDoc = await db.collection('orders').doc(req.params.id).get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
