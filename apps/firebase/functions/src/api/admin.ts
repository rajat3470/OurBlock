import { Router } from 'express';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { MOCK_TOKEN_UIDS } from '../middleware/requireAuth';
import {
  docToJson,
  docsToJson,
  parsePagination,
  normalizeRole,
  handleFirebaseAuthError,
  buildBusinessCountMap,
} from '../utils/routeHelpers';
import { isValidEmail, isValidPhoneNumber } from '../shared/utils';

const router = Router();
const db = admin.firestore();
const auth = admin.auth();

const SUPER_ADMIN_EMAIL_ALLOWLIST = new Set(
  (process.env.SUPER_ADMIN_EMAILS || 'ankushrishi5@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const requireSuperAdmin = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

  try {
    let uid = '';
    let claimRole: 'superAdmin' | 'businessOwner' | 'user' | null = null;
    let decodedEmail: string | null = null;
    if (token in MOCK_TOKEN_UIDS) {
      uid = MOCK_TOKEN_UIDS[token];
      claimRole = uid === 'mock-super-admin-1' ? 'superAdmin' : null;
    } else {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
      claimRole = normalizeRole((decoded as any)?.role);
      decodedEmail = typeof (decoded as any)?.email === 'string' ? (decoded as any).email.toLowerCase() : null;
    }

    // Prefer token custom claims (source of truth for role-based auth),
    // fallback to Firestore user role for backward compatibility.
    if (claimRole !== 'superAdmin') {
      const userDoc = await db.collection('users').doc(uid).get();
      const firestoreRole = userDoc.exists ? normalizeRole((userDoc.data() as any)?.role) : null;
      const firestoreEmail = userDoc.exists && typeof (userDoc.data() as any)?.email === 'string'
        ? String((userDoc.data() as any).email).toLowerCase()
        : null;

      const isAllowlistedEmail = Boolean(
        (decodedEmail && SUPER_ADMIN_EMAIL_ALLOWLIST.has(decodedEmail)) ||
        (firestoreEmail && SUPER_ADMIN_EMAIL_ALLOWLIST.has(firestoreEmail))
      );

      if (firestoreRole !== 'superAdmin' && !isAllowlistedEmail) {
        return res.status(403).json({ success: false, error: 'Super admin access required' });
      }
    }

    req.uid = uid;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

router.use(requireSuperAdmin);

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
    const { page, limit } = parsePagination(req.query, { limit: 50 });
    const [snapshot, businessCountMap] = await Promise.all([
      db.collection('societies')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get(),
      buildBusinessCountMap(db),
    ]);

    const data = snapshot.docs.map((doc) => ({
      ...docToJson(doc),
      totalBusinesses: businessCountMap[doc.id] ?? 0,
    }));
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Businesses proxy (paginated) ─────────────────────────────────────────────

router.get('/businesses', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 50 });
    const snapshot = await db
      .collection('businesses')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const data = docsToJson(snapshot);
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Users proxy (paginated) ──────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 50 });
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const data = docsToJson(snapshot);
    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
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

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    if (!isValidPhoneNumber(phone)) {
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
    if (handleFirebaseAuthError(res, error)) return;
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Products — admin approval queue ─────────────────────────────────────────

// GET /admin/products?approvalStatus=pending|approved|rejected&businessId=...
router.get('/products', async (req, res) => {
  try {
    const { approvalStatus, businessId } = req.query;
    const { page, limit } = parsePagination(req.query, { limit: 50 });

    let query: admin.firestore.Query = db.collection('products');

    if (businessId) {
      query = query.where('businessId', '==', businessId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    // Enrich each product with its business name
    const businessIds = [...new Set(snapshot.docs.map((d) => d.data().businessId as string).filter(Boolean))];
    const businessDocs = await Promise.all(businessIds.map((id) => db.collection('businesses').doc(id).get()));
    const businessMap: Record<string, string> = {};
    businessDocs.forEach((d) => { if (d.exists) businessMap[d.id] = (d.data() as any).name; });

    const data = snapshot.docs
      .map((doc) => {
        const product = doc.data() as any;
        return {
          ...docToJson(doc),
          approvalStatus: deriveProductApprovalStatus(product),
          businessName: businessMap[product.businessId] ?? null,
        };
      })
      .filter((product) => !approvalStatus || product.approvalStatus === approvalStatus)
      .slice((page - 1) * limit, page * limit);

    res.json({ success: true, data, pagination: { page, limit, total: data.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
function deriveProductApprovalStatus(product: any): 'pending' | 'approved' | 'rejected' {
  if (product.approvalStatus === 'approved' || product.isVerified === true) {
    return 'approved';
  }
  if (product.approvalStatus === 'rejected') {
    return 'rejected';
  }
  return 'pending';
}

// POST /admin/products/:id/approve
router.post('/products/:id/approve', async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).update({
      approvalStatus: 'approved',
      isVerified: true,
      approvalNote: null,
      status: 'active',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('products').doc(req.params.id).get();
    res.json({ success: true, data: docToJson(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /admin/products/:id/reject
router.post('/products/:id/reject', async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).update({
      approvalStatus: 'rejected',
      isVerified: false,
      approvalNote: req.body.note ?? null,
      status: 'inactive',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('products').doc(req.params.id).get();
    res.json({ success: true, data: docToJson(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
    res.json({ success: true, data: docToJson(doc) });
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
    res.json({ success: true, data: docToJson(doc) });
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
    res.json({ success: true, data: docToJson(doc) });
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
    res.json({ success: true, data: docToJson(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Home Banners CMS (Super Admin only) ───────────────────────────────────

function parseDateInput(value: any): admin.firestore.Timestamp | null {
  if (!value) return null;
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return admin.firestore.Timestamp.fromDate(d);
  }
  if (typeof value?.seconds === 'number') {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds ?? 0);
  }
  return null;
}

router.get('/banners', async (req, res) => {
  try {
    const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;

    let query: admin.firestore.Query = db.collection('homeBanners');
    if (societyId) {
      query = db.collection('homeBanners').where('societyId', '==', societyId);
    }

    const snapshot = await query.get();
    const data = snapshot.docs
      .map((doc) => docToJson(doc) as any)
      .sort((a, b) => Number(a.sortOrder ?? 100) - Number(b.sortOrder ?? 100));
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/banners', async (req, res) => {
  try {
    const {
      title,
      subtitle,
      imageUrl,
      tagText,
      ctaText,
      ctaRoute,
      societyId,
      isActive,
      sortOrder,
      startAt,
      endAt,
      theme,
    } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, error: 'title is required' });
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'imageUrl is required' });
    }

    const docRef = db.collection('homeBanners').doc();
    const payload = {
      title: title.trim(),
      subtitle: typeof subtitle === 'string' ? subtitle.trim() : '',
      imageUrl: imageUrl.trim(),
      tagText: typeof tagText === 'string' ? tagText.trim() : 'TRENDING IN YOUR SOCIETY',
      ctaText: typeof ctaText === 'string' ? ctaText.trim() : '',
      ctaRoute: typeof ctaRoute === 'string' ? ctaRoute.trim() : '',
      societyId: typeof societyId === 'string' && societyId.trim() ? societyId.trim() : 'global',
      isActive: Boolean(isActive ?? true),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
      startAt: parseDateInput(startAt),
      endAt: parseDateInput(endAt),
      theme: typeof theme === 'object' && theme ? theme : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: (req as any).uid,
    };

    await docRef.set(payload);
    const newDoc = await docRef.get();
    return res.status(201).json({ success: true, data: docToJson(newDoc) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/banners/:id', async (req, res) => {
  try {
    const docRef = db.collection('homeBanners').doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }

    const {
      title,
      subtitle,
      imageUrl,
      tagText,
      ctaText,
      ctaRoute,
      societyId,
      isActive,
      sortOrder,
      startAt,
      endAt,
      theme,
    } = req.body;

    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: (req as any).uid,
    };

    if (title !== undefined) updates.title = String(title).trim();
    if (subtitle !== undefined) updates.subtitle = String(subtitle || '').trim();
    if (imageUrl !== undefined) updates.imageUrl = String(imageUrl || '').trim();
    if (tagText !== undefined) updates.tagText = String(tagText || '').trim();
    if (ctaText !== undefined) updates.ctaText = String(ctaText || '').trim();
    if (ctaRoute !== undefined) updates.ctaRoute = String(ctaRoute || '').trim();
    if (societyId !== undefined) updates.societyId = String(societyId || '').trim() || 'global';
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (sortOrder !== undefined) updates.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100;
    if (startAt !== undefined) updates.startAt = parseDateInput(startAt);
    if (endAt !== undefined) updates.endAt = parseDateInput(endAt);
    if (theme !== undefined) updates.theme = typeof theme === 'object' && theme ? theme : null;

    await docRef.update(updates);
    const updated = await docRef.get();
    return res.json({ success: true, data: docToJson(updated) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    const docRef = db.collection('homeBanners').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }

    await docRef.delete();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
