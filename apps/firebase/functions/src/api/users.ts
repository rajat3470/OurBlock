import { Router } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-access-token-superadmin': 'mock-super-admin-1',
  'mock-access-token-businessowner': 'mock-business-owner-1',
  'mock-access-token-user': 'mock-user-1',
};

const requireAuth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  if (token in MOCK_TOKEN_UIDS) {
    req.uid = MOCK_TOKEN_UIDS[token];
    req.user = { uid: req.uid };
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.user = { uid: decoded.uid };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

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

router.use('/profile', requireAuth);
router.use('/addresses', requireAuth);
router.use('/verify-phone', requireAuth);

// Current user profile endpoints
router.get('/profile/me', async (req, res) => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/profile/me', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { email, password, role, createdAt, id, ...updateData } = req.body;

    await db.collection('users').doc(userId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await db.collection('users').doc(userId).get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Address Management
router.get('/addresses/me', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const snapshot = await db.collection('users').doc(userId).collection('addresses').get();

    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    const getTime = (v: any) => {
      if (!v) return 0;
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (typeof v.seconds === 'number') return v.seconds * 1000;
      if (typeof v._seconds === 'number') return v._seconds * 1000;
      return 0;
    };

    addresses.sort((a, b) => {
      if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
        return a.isDefault ? -1 : 1;
      }
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    return res.json(addresses);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/addresses/me', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, name, street, landmark, city, state, pincode, phone, isDefault } = req.body;

    if (!type || !street || !city || !state || !pincode || !phone) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      const addressesSnapshot = await db.collection('users').doc(userId).collection('addresses').get();
      const batch = db.batch();
      addressesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const addressRef = db.collection('users').doc(userId).collection('addresses').doc();
    const newAddress = {
      id: addressRef.id,
      userId,
      type,
      name: name || null,
      street,
      landmark: landmark || null,
      city,
      state,
      pincode,
      phone,
      isDefault: isDefault || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await addressRef.set(newAddress);
    return res.status(201).json({ ...newAddress });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/addresses/:addressId', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(userId).collection('addresses').doc(addressId);

    const addressDoc = await addressRef.get();
    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const { id, userId: uid, createdAt, ...updateData } = req.body;

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      const addressesSnapshot = await db.collection('users').doc(userId).collection('addresses').get();
      const batch = db.batch();
      addressesSnapshot.docs.forEach(doc => {
        if (doc.id !== addressId) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    await addressRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await addressRef.get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/addresses/:addressId', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(userId).collection('addresses').doc(addressId);

    const addressDoc = await addressRef.get();
    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    await addressRef.delete();
    return res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/addresses/:addressId/set-default', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(userId).collection('addresses').doc(addressId);

    const addressDoc = await addressRef.get();
    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    // Unset all defaults
    const addressesSnapshot = await db.collection('users').doc(userId).collection('addresses').get();
    const batch = db.batch();
    addressesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isDefault: doc.id === addressId });
    });
    await batch.commit();

    const updatedDoc = await addressRef.get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Phone Verification
router.post('/verify-phone/me', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { code, verificationId } = req.body;

    if (!code || !verificationId) {
      return res.status(400).json({ success: false, error: 'Code and verificationId are required' });
    }

    // Note: Phone verification is handled client-side with Firebase Phone Auth
    // This endpoint just marks the user as verified after successful client-side verification
    await db.collection('users').doc(userId).update({
      isPhoneVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
