import { Router } from 'express';
import * as admin from 'firebase-admin';
import { validationSchemas } from '../shared/validation';

const router = Router();
const db = admin.firestore();

// Get all societies
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const snapshot = await db
      .collection('societies')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(offset)
      .get();
    
    const societies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({
      success: true,
      data: societies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: societies.length,
      },
    });
  } catch (error: any) {
    console.error('Get societies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get society by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('societies').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Society not found' });
    }
    
    return res.json({
      success: true,
      data: { id: doc.id, ...doc.data() },
    });
  } catch (error: any) {
    console.error('Get society error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create society (Super Admin only)
router.post('/', async (req, res) => {
  try {
    const validatedData = validationSchemas.society.parse(req.body);
    
    const docRef = await db.collection('societies').add({
      ...validatedData,
      status: 'active',
      totalBusinesses: 0,
      totalUsers: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const newDoc = await docRef.get();
    
    res.status(201).json({
      success: true,
      data: { id: newDoc.id, ...newDoc.data() },
    });
  } catch (error: any) {
    console.error('Create society error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update society
router.put('/:id', async (req, res) => {
  try {
    const validatedData = validationSchemas.society.partial().parse(req.body);
    
    await db.collection('societies').doc(req.params.id).update({
      ...validatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const updatedDoc = await db.collection('societies').doc(req.params.id).get();
    
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error: any) {
    console.error('Update society error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete society
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('societies').doc(req.params.id).delete();
    
    res.json({
      success: true,
      message: 'Society deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete society error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
