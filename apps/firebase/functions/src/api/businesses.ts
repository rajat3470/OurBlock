import { Router } from 'express';
import * as admin from 'firebase-admin';
import { docToJson, docsToJson } from '../utils/routeHelpers';

const router = Router();
const db = admin.firestore();

// Get businesses by society
router.get('/', async (req, res) => {
  try {
    const { societyId, category, status = 'active' } = req.query;
    
    let query = db.collection('businesses').where('status', '==', status);
    
    if (societyId) {
      query = query.where('societyId', '==', societyId);
    }
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const businesses = docsToJson(snapshot);
    
    res.json({ success: true, data: businesses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get business by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('businesses').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    
    return res.json({ success: true, data: docToJson(doc) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create business
router.post('/', async (req, res) => {
  try {
    const docRef = await db.collection('businesses').add({
      ...req.body,
      status: 'active',
      isVerified: false,
      rating: 0,
      totalReviews: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const newDoc = await docRef.get();
    res.status(201).json({ success: true, data: docToJson(newDoc) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update business
router.put('/:id', async (req, res) => {
  try {
    await db.collection('businesses').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updatedDoc = await db.collection('businesses').doc(req.params.id).get();
    res.json({ success: true, data: docToJson(updatedDoc) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete business
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('businesses').doc(req.params.id).delete();
    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
