import { Router } from 'express';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [societiesSnap, businessesSnap, usersSnap] = await Promise.all([
      db.collection('societies').where('status', '==', 'active').get(),
      db.collection('businesses').get(),
      db.collection('users').get(),
    ]);

    const pendingVerifications = businessesSnap.docs.filter(
      (d) => !d.data().isVerified,
    ).length;

    res.json({
      success: true,
      data: {
        totalSocieties: societiesSnap.size,
        totalBusinesses: businessesSnap.size,
        pendingVerifications,
        totalUsers: usersSnap.size,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Societies proxy (paginated) ──────────────────────────────────────────────

router.get('/societies', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [snapshot, businessSnap] = await Promise.all([
      db.collection('societies')
        .orderBy('createdAt', 'desc')
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit))
        .get(),
      db.collection('businesses').get(),
    ]);

    // Build live business count per society
    const businessCountMap: Record<string, number> = {};
    businessSnap.docs.forEach((doc) => {
      const sid = doc.data().societyId as string | undefined;
      if (sid) businessCountMap[sid] = (businessCountMap[sid] ?? 0) + 1;
    });

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      totalBusinesses: businessCountMap[doc.id] ?? 0,
    }));
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Businesses proxy (paginated) ─────────────────────────────────────────────

router.get('/businesses', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const snapshot = await db
      .collection('businesses')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Users proxy (paginated) ──────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Create Business Owner ────────────────────────────────────────────────────
// Called by Super Admin to provision a business-owner account.
// Returns the temporary password so the admin can share it with the owner.

router.post('/business-owners', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, societyId } = req.body;

    if (!firstName || !lastName || !email || !phone || !societyId) {
      return res
        .status(400)
        .json({ success: false, error: 'firstName, lastName, email, phone and societyId are all required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    // Validate Indian phone number
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    // Confirm society exists
    const societyDoc = await db.collection('societies').doc(societyId).get();
    if (!societyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Society not found' });
    }

    // Generate a secure temporary password: 12 chars, alphanumeric + special
    const rawBytes = crypto.randomBytes(16).toString('base64');
    const tempPassword = rawBytes.replace(/[^a-zA-Z0-9]/g, 'x').slice(0, 10) + '@1';

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName: `${firstName} ${lastName}`,
      phoneNumber: `+91${phone}`,
    });

    // Stamp role as a custom claim so the mobile app can gate on it
    await auth.setCustomUserClaims(userRecord.uid, { role: 'businessOwner' });

    // Persist Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      firstName,
      lastName,
      email,
      phone,
      role: 'businessOwner',
      societyId,
      isEmailVerified: false,
      isPhoneVerified: false,
      status: 'active',
      verificationStatus: 'pending',
      mustChangePassword: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email,
        temporaryPassword: tempPassword,
        message: 'Business owner account created. Share credentials securely.',
      },
    });
  } catch (error: any) {
    console.error('Create business owner error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    if (error.code === 'auth/phone-number-already-exists') {
      return res.status(409).json({ success: false, error: 'An account with this phone number already exists' });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Verify / Reject business shortcuts ──────────────────────────────────────

router.post('/businesses/:id/verify', async (req, res) => {
  try {
    await db.collection('businesses').doc(req.params.id).update({
      isVerified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('businesses').doc(req.params.id).get();
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/businesses/:id/reject', async (req, res) => {
  try {
    await db.collection('businesses').doc(req.params.id).update({
      isVerified: false,
      rejectionReason: req.body.reason ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('businesses').doc(req.params.id).get();
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Suspend / Activate user shortcuts ───────────────────────────────────────

router.post('/users/:id/suspend', async (req, res) => {
  try {
    await auth.updateUser(req.params.id, { disabled: true });
    await db.collection('users').doc(req.params.id).update({
      status: 'suspended',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('users').doc(req.params.id).get();
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users/:id/activate', async (req, res) => {
  try {
    await auth.updateUser(req.params.id, { disabled: false });
    await db.collection('users').doc(req.params.id).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('users').doc(req.params.id).get();
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
