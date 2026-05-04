import { Router } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { role, societyId, status = 'active' } = req.query;
    
    let query: any = db.collection('users').where('status', '==', status);
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    if (societyId) {
      query = query.where('societyId', '==', societyId);
    }
    
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updatedDoc = await db.collection('users').doc(req.params.id).get();
    res.json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await admin.auth().deleteUser(req.params.id);
    await db.collection('users').doc(req.params.id).delete();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
