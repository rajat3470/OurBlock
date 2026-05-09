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

// Delete society — cascades to businesses, products, orders, and business-owner accounts
router.delete('/:id', async (req, res) => {
  const societyId = req.params.id;
  try {
    // 1. Confirm the society exists first
    const societyDoc = await db.collection('societies').doc(societyId).get();
    if (!societyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Society not found' });
    }

    // 2. Fetch all businesses belonging to this society
    const businessesSnap = await db
      .collection('businesses')
      .where('societyId', '==', societyId)
      .get();

    const businessIds = businessesSnap.docs.map((d) => d.id);

    // 3. For each business: delete its products and orders in batches
    //    Firestore batch is limited to 500 ops — chunk accordingly
    const BATCH_SIZE = 400;

    const deleteInBatches = async (
      snapshot: FirebaseFirestore.QuerySnapshot
    ) => {
      let batch = db.batch();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    };

    for (const businessId of businessIds) {
      const [productsSnap, ordersSnap] = await Promise.all([
        db.collection('products').where('businessId', '==', businessId).get(),
        db.collection('orders').where('businessId', '==', businessId).get(),
      ]);
      await Promise.all([
        deleteInBatches(productsSnap),
        deleteInBatches(ordersSnap),
      ]);
    }

    // 4. Delete all business docs
    if (businessesSnap.docs.length > 0) {
      await deleteInBatches(businessesSnap);
    }

    // 5. Delete business-owner user accounts linked to this society
    const ownerUsersSnap = await db
      .collection('users')
      .where('societyId', '==', societyId)
      .where('role', '==', 'businessOwner')
      .get();

    const authDeletePromises = ownerUsersSnap.docs.map((d) =>
      admin.auth().deleteUser(d.id).catch(() => {
        // If the Firebase Auth user was already removed, continue gracefully
      })
    );
    await Promise.all(authDeletePromises);

    if (ownerUsersSnap.docs.length > 0) {
      await deleteInBatches(ownerUsersSnap);
    }

    // 6. Finally delete the society itself
    await db.collection('societies').doc(societyId).delete();

    return res.json({
      success: true,
      message: 'Society and all associated businesses, products, orders, and owner accounts deleted',
      summary: {
        businessesDeleted: businessesSnap.size,
        ownerAccountsDeleted: ownerUsersSnap.size,
      },
    });
  } catch (error: any) {
    console.error('Delete society cascade error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
