import { Router } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

// Get businesses by society (excludes suspended businesses by default)
router.get('/', async (req, res) => {
  try {
    const { societyId, category, status = 'active', includeSuspended = 'false' } = req.query;
    const shouldIncludeSuspended = includeSuspended === 'true';
    
    let query = db.collection('businesses').where('status', '==', status);
    
    if (societyId) {
      query = query.where('societyId', '==', societyId);
    }
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const businesses = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter((business: any) => {
        // Exclude suspended businesses unless explicitly requested
        if (!shouldIncludeSuspended && business.status === 'suspended') {
          return false;
        }
        return true;
      });
    
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

    const business = doc.data() as any;
    // Hide suspended businesses from non-admin users
    if (business?.status === 'suspended') {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    
    return res.json({ success: true, data: { id: doc.id, ...business } });
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
    res.status(201).json({ success: true, data: { id: newDoc.id, ...newDoc.data() } });
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
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
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
