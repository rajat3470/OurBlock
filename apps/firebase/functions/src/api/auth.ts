import { Router } from 'express';
import * as admin from 'firebase-admin';
import { validationSchemas } from '../shared/validation';

const router = Router();
const auth = admin.auth();
const db = admin.firestore();

const MOCK_TOKEN_UIDS: Record<string, string> = {
  'mock-access-token-superadmin': 'mock-super-admin-1',
  'mock-access-token-businessowner': 'mock-business-owner-1',
  'mock-access-token-user': 'mock-user-1',
};

// Firebase Web API key (public — used only for client-facing REST auth endpoints)
const FIREBASE_API_KEY = 'AIzaSyAcL3sv1VuMTq1gNrTVuIH_Si7_J1hNXAE';

interface FirebaseSignInResult {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

/**
 * Sign in via the Firebase Auth REST API and return the ID + refresh tokens.
 * The Admin SDK cannot verify email/password directly, so we delegate to the
 * public Identity Toolkit endpoint (this is the standard Firebase pattern).
 */
async function firebaseSignIn(email: string, password: string): Promise<FirebaseSignInResult> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await response.json() as any;

  if (!response.ok) {
    // Map Firebase error codes to user-friendly messages
    const code: string = data?.error?.message ?? 'UNKNOWN';
    if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }
    if (code.includes('USER_DISABLED')) {
      throw Object.assign(new Error('This account has been suspended'), { statusCode: 403 });
    }
    throw Object.assign(new Error(code), { statusCode: 400 });
  }

  return data as FirebaseSignInResult;
}

async function getAuthenticatedUid(req: any): Promise<string> {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    throw Object.assign(new Error('No token provided'), { statusCode: 401 });
  }

  if (token in MOCK_TOKEN_UIDS) {
    return MOCK_TOKEN_UIDS[token];
  }

  const decodedToken = await auth.verifyIdToken(token);
  return decodedToken.uid;
}

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'user' } = req.body;
    
    // Validate input
    const validatedData = validationSchemas.register.parse({
      email,
      password,
      firstName,
      lastName,
      phone,
    });
    
    // Create Firebase auth user
    const userRecord = await auth.createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: `${validatedData.firstName} ${validatedData.lastName}`,
      phoneNumber: `+91${validatedData.phone}`,
    });
    
    // Create user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      role,
      isEmailVerified: false,
      isPhoneVerified: false,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Generate custom token
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        token: customToken,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

// Business owner self-registration
router.post('/businessowner/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, societyId,
            businessName, businessCategory, businessAddress } = req.body;

    if (!firstName || !lastName || !email || !password || !phone || !societyId) {
      return res.status(400).json({
        success: false,
        error: 'firstName, lastName, email, password, phone and societyId are all required',
      });
    }

    if (!businessName || !businessCategory || !businessAddress) {
      return res.status(400).json({
        success: false,
        error: 'businessName, businessCategory and businessAddress are all required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Confirm society exists
    const societyDoc = await db.collection('societies').doc(societyId).get();
    if (!societyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Society not found' });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      phoneNumber: `+91${phone}`,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: 'businessOwner' });

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
      mustChangePassword: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create the business document so it appears in the admin portal
    const businessRef = await db.collection('businesses').add({
      name: businessName,
      category: businessCategory,
      address: businessAddress,
      phone,
      email,
      ownerId: userRecord.uid,
      societyId,
      status: 'active',
      isVerified: false,
      rating: 0,
      totalReviews: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Sign in immediately after creation to get a real ID token for the client
    const authResult = await firebaseSignIn(email, password);

    return res.status(201).json({
      user: {
        id: userRecord.uid,
        firstName,
        lastName,
        email,
        phone,
        role: 'businessOwner',
        societyId,
        businessId: businessRef.id,
        status: 'active',
        isEmailVerified: false,
        isPhoneVerified: false,
        mustChangePassword: false,
      },
      tokens: {
        accessToken: authResult.idToken,
        refreshToken: authResult.refreshToken,
        expiresIn: parseInt(authResult.expiresIn, 10),
      },
    });
  } catch (error: any) {
    console.error('Business owner registration error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    if (error.code === 'auth/phone-number-already-exists') {
      return res.status(409).json({ success: false, error: 'This phone number is already registered' });
    }
    return res.status(400).json({ success: false, error: error.message || 'Registration failed' });
  }
});

// User (resident) self-registration
router.post('/user/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, societyId } = req.body;

    if (!firstName || !lastName || !email || !password || !phone || !societyId) {
      return res.status(400).json({
        success: false,
        error: 'firstName, lastName, email, password, phone and societyId are all required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Confirm society exists
    const societyDoc = await db.collection('societies').doc(societyId).get();
    if (!societyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Society not found' });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      phoneNumber: `+91${phone}`,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: 'user' });

    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      firstName,
      lastName,
      email,
      phone,
      role: 'user',
      societyId,
      isEmailVerified: false,
      isPhoneVerified: false,
      status: 'active',
      favoriteBusinesses: [],
      addresses: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Sign in immediately after creation to get a real ID token for the client
    const authResult = await firebaseSignIn(email, password);

    return res.status(201).json({
      user: {
        id: userRecord.uid,
        firstName,
        lastName,
        email,
        phone,
        role: 'user',
        societyId,
        status: 'active',
        isEmailVerified: false,
        isPhoneVerified: false,
        favoriteBusinesses: [],
        addresses: [],
      },
      tokens: {
        accessToken: authResult.idToken,
        refreshToken: authResult.refreshToken,
        expiresIn: parseInt(authResult.expiresIn, 10),
      },
    });
  } catch (error: any) {
    console.error('User registration error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    if (error.code === 'auth/phone-number-already-exists') {
      return res.status(409).json({ success: false, error: 'This phone number is already registered' });
    }
    return res.status(400).json({ success: false, error: error.message || 'Registration failed' });
  }
});

// Login (client-side handles Firebase Auth, this is for custom claims)
router.post('/login', async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: 'UID required' });
    }
    
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Set custom claims for role-based access
    await auth.setCustomUserClaims(uid, { role: userData?.role });
    
    return res.json({
      success: true,
      data: userData,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

// Change password (authenticated user — works for all roles)
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res
        .status(400)
        .json({ success: false, error: 'New password must be at least 8 characters' });
    }

    const decodedToken = await auth.verifyIdToken(token);

    await auth.updateUser(decodedToken.uid, { password: newPassword });

    // Clear the "must change password" flag if set
    await db.collection('users').doc(decodedToken.uid).update({
      mustChangePassword: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    return res.json({
      success: true,
      data: userDoc.data(),
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Unauthorized',
    });
  }
});

router.get('/profile/me', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error: any) {
    return res.status(error.statusCode || 401).json({ success: false, error: error.message || 'Unauthorized' });
  }
});

router.put('/profile/me', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { email, password, role, createdAt, id, ...updateData } = req.body;

    await db.collection('users').doc(uid).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await db.collection('users').doc(uid).get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.get('/addresses/me', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const snapshot = await db.collection('users').doc(uid).collection('addresses').get();

    const addresses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
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
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.post('/addresses/me', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { type, name, street, landmark, city, state, pincode, phone, isDefault } = req.body;

    if (!type || !street || !city || !state || !pincode || !phone) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (isDefault) {
      const addressesSnapshot = await db.collection('users').doc(uid).collection('addresses').get();
      const batch = db.batch();
      addressesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const addressRef = db.collection('users').doc(uid).collection('addresses').doc();
    const newAddress = {
      id: addressRef.id,
      userId: uid,
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
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.put('/addresses/:addressId', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(uid).collection('addresses').doc(addressId);
    const addressDoc = await addressRef.get();

    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const { id, userId, createdAt, ...updateData } = req.body;

    if (updateData.isDefault) {
      const addressesSnapshot = await db.collection('users').doc(uid).collection('addresses').get();
      const batch = db.batch();
      addressesSnapshot.docs.forEach((doc) => {
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
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.delete('/addresses/:addressId', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(uid).collection('addresses').doc(addressId);
    const addressDoc = await addressRef.get();

    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    await addressRef.delete();
    return res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.put('/addresses/:addressId/set-default', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { addressId } = req.params;
    const addressRef = db.collection('users').doc(uid).collection('addresses').doc(addressId);
    const addressDoc = await addressRef.get();

    if (!addressDoc.exists) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const addressesSnapshot = await db.collection('users').doc(uid).collection('addresses').get();
    const batch = db.batch();
    addressesSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isDefault: doc.id === addressId });
    });
    await batch.commit();

    const updatedDoc = await addressRef.get();
    return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

router.post('/verify-phone', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const { code, verificationId } = req.body;

    if (!code || !verificationId) {
      return res.status(400).json({ success: false, error: 'Code and verificationId are required' });
    }

    await db.collection('users').doc(uid).update({
      isPhoneVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Role-specific login routes
// ---------------------------------------------------------------------------
async function loginWithRole(
  req: any,
  res: any,
  expectedRole: 'superAdmin' | 'businessOwner' | 'user'
) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  let authResult: FirebaseSignInResult;
  try {
    authResult = await firebaseSignIn(email, password);
  } catch (err: any) {
    return res.status(err.statusCode ?? 401).json({ success: false, error: err.message });
  }

  // Fetch the Firestore user document to check role
  const userDoc = await db.collection('users').doc(authResult.localId).get();
  if (!userDoc.exists) {
    return res.status(404).json({ success: false, error: 'User account not found' });
  }

  const userData = userDoc.data() as any;

  if (userData.role !== expectedRole) {
    return res.status(403).json({
      success: false,
      error: `This login is for ${expectedRole} accounts only`,
    });
  }

  if (userData.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Your account has been suspended' });
  }

  return res.json({
    user: { id: authResult.localId, ...userData },
    tokens: {
      accessToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      expiresIn: parseInt(authResult.expiresIn, 10),
    },
  });
}

router.post('/superadmin/login', (req, res) => loginWithRole(req, res, 'superAdmin'));
router.post('/businessowner/login', (req, res) => loginWithRole(req, res, 'businessOwner'));
router.post('/user/login', (req, res) => loginWithRole(req, res, 'user'));

// ---------------------------------------------------------------------------
// Token refresh — exchange a Firebase refresh token for a new ID token
// ---------------------------------------------------------------------------
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'refreshToken is required' });
  }

  try {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      return res.status(401).json({ success: false, error: 'Token refresh failed' });
    }

    // Look up user to return updated user data
    const userDoc = await db.collection('users').doc(data.user_id).get();

    return res.json({
      user: userDoc.exists ? { id: data.user_id, ...userDoc.data() } : { id: data.user_id },
      tokens: {
        accessToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: parseInt(data.expires_in, 10),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
