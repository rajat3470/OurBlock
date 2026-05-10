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

const HOME_BUSINESS_SEEDS = [
  {
    name: 'DailyFresh Mart',
    category: 'grocery',
    description: 'Fresh groceries and daily essentials delivered fast.',
    addressSuffix: 'Central Plaza, Main Gate',
    phone: '9876501001',
    rating: 4.6,
    totalReviews: 248,
  },
  {
    name: 'Spice Route Kitchen',
    category: 'restaurant',
    description: 'North Indian and street food favorites.',
    addressSuffix: 'Food Court, Block B',
    phone: '9876501002',
    rating: 4.4,
    totalReviews: 196,
  },
  {
    name: 'MediTrust Pharmacy',
    category: 'pharmacy',
    description: 'Medicines, wellness, and health essentials.',
    addressSuffix: 'Wellness Street, Block A',
    phone: '9876501003',
    rating: 4.7,
    totalReviews: 312,
  },
  {
    name: 'BrewBean Cafe',
    category: 'cafe',
    description: 'Coffee, snacks, and quick bites.',
    addressSuffix: 'Clubhouse Corner',
    phone: '9876501004',
    rating: 4.5,
    totalReviews: 154,
  },
  {
    name: 'StyleNest Boutique',
    category: 'clothing',
    description: 'Everyday fashion and accessories for all.',
    addressSuffix: 'Lifestyle Lane, Tower 2',
    phone: '9876501005',
    rating: 4.3,
    totalReviews: 121,
  },
];

const HOME_PRODUCT_SEEDS: Record<string, Array<{
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  rating: number;
  totalReviews: number;
}>> = {
  grocery: [
    { name: 'A2 Cow Milk 1L', category: 'Dairy', price: 72, originalPrice: 82, stock: 120, rating: 4.5, totalReviews: 92 },
    { name: 'Farm Eggs 12 pcs', category: 'Dairy', price: 96, originalPrice: 110, stock: 80, rating: 4.6, totalReviews: 74 },
    { name: 'Organic Atta 5kg', category: 'Staples', price: 269, originalPrice: 299, stock: 40, rating: 4.7, totalReviews: 65 },
    { name: 'Seasonal Fruit Box', category: 'Fruits', price: 349, originalPrice: 399, stock: 35, rating: 4.4, totalReviews: 51 },
  ],
  restaurant: [
    { name: 'Paneer Butter Masala', category: 'Main Course', price: 229, originalPrice: 259, stock: 60, rating: 4.4, totalReviews: 119 },
    { name: 'Veg Biryani Family Pack', category: 'Main Course', price: 299, originalPrice: 349, stock: 45, rating: 4.5, totalReviews: 141 },
    { name: 'Tandoori Roti (6)', category: 'Breads', price: 79, originalPrice: 99, stock: 90, rating: 4.3, totalReviews: 88 },
    { name: 'Gulab Jamun', category: 'Desserts', price: 99, originalPrice: 129, stock: 55, rating: 4.6, totalReviews: 97 },
  ],
  pharmacy: [
    { name: 'Vitamin C Tablets', category: 'Supplements', price: 189, originalPrice: 229, stock: 70, rating: 4.6, totalReviews: 77 },
    { name: 'Digital Thermometer', category: 'Devices', price: 249, originalPrice: 299, stock: 32, rating: 4.5, totalReviews: 43 },
    { name: 'Pain Relief Spray', category: 'First Aid', price: 139, originalPrice: 159, stock: 66, rating: 4.4, totalReviews: 38 },
    { name: 'Hand Sanitizer 500ml', category: 'Hygiene', price: 99, originalPrice: 129, stock: 88, rating: 4.3, totalReviews: 52 },
  ],
  cafe: [
    { name: 'Cold Coffee', category: 'Beverages', price: 129, originalPrice: 149, stock: 100, rating: 4.5, totalReviews: 80 },
    { name: 'Cappuccino', category: 'Beverages', price: 119, originalPrice: 139, stock: 100, rating: 4.6, totalReviews: 97 },
    { name: 'Veg Sandwich', category: 'Snacks', price: 149, originalPrice: 179, stock: 72, rating: 4.4, totalReviews: 63 },
    { name: 'Blueberry Muffin', category: 'Bakery', price: 89, originalPrice: 109, stock: 54, rating: 4.2, totalReviews: 44 },
  ],
  clothing: [
    { name: 'Cotton T-Shirt', category: 'Men', price: 599, originalPrice: 799, stock: 40, rating: 4.3, totalReviews: 35 },
    { name: 'Summer Dress', category: 'Women', price: 1199, originalPrice: 1499, stock: 25, rating: 4.5, totalReviews: 41 },
    { name: 'Kids Joggers', category: 'Kids', price: 499, originalPrice: 649, stock: 30, rating: 4.4, totalReviews: 28 },
    { name: 'Classic Backpack', category: 'Accessories', price: 899, originalPrice: 1099, stock: 22, rating: 4.2, totalReviews: 19 },
  ],
};

async function ensureSocietyDemoCatalog(societyId: string) {
  const existingBusinessesSnap = await db
    .collection('businesses')
    .where('societyId', '==', societyId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!existingBusinessesSnap.empty) {
    return;
  }

  const societyDoc = await db.collection('societies').doc(societyId).get();
  const societyName = (societyDoc.data()?.name as string) || 'Your Society';
  const now = admin.firestore.FieldValue.serverTimestamp();

  const businessesBatch = db.batch();
  const businessRefs: Array<{ id: string; category: string }> = [];

  HOME_BUSINESS_SEEDS.forEach((seed, index) => {
    const ref = db.collection('businesses').doc();
    businessRefs.push({ id: ref.id, category: seed.category });

    businessesBatch.set(ref, {
      id: ref.id,
      name: seed.name,
      category: seed.category,
      description: seed.description,
      ownerId: `demo-owner-${index + 1}`,
      societyId,
      address: `${societyName}, ${seed.addressSuffix}`,
      phone: seed.phone,
      email: `hello+${seed.name.toLowerCase().replace(/\s+/g, '')}@ourblock.in`,
      rating: seed.rating,
      totalReviews: seed.totalReviews,
      isVerified: true,
      status: 'active',
      metadata: {
        isDemo: true,
        etaMins: 12 + index * 3,
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  await businessesBatch.commit();

  const productsBatch = db.batch();
  businessRefs.forEach((business) => {
    const seeds = HOME_PRODUCT_SEEDS[business.category] ?? [];
    seeds.forEach((productSeed) => {
      const productRef = db.collection('products').doc();
      const discount = productSeed.originalPrice
        ? Math.round(((productSeed.originalPrice - productSeed.price) / productSeed.originalPrice) * 100)
        : 0;

      productsBatch.set(productRef, {
        id: productRef.id,
        businessId: business.id,
        name: productSeed.name,
        description: `${productSeed.name} from trusted local stores`,
        category: productSeed.category,
        price: productSeed.price,
        originalPrice: productSeed.originalPrice ?? null,
        discount,
        imageUrls: [],
        stock: productSeed.stock,
        rating: productSeed.rating,
        totalReviews: productSeed.totalReviews,
        status: 'active',
        availableToday: true,
        metadata: {
          isDemo: true,
          societyId,
        },
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  await productsBatch.commit();
}

async function getSocietyProducts(businessIds: string[]) {
  if (businessIds.length === 0) {
    return [] as any[];
  }

  const chunks: string[][] = [];
  for (let i = 0; i < businessIds.length; i += 10) {
    chunks.push(businessIds.slice(i, i + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      db
        .collection('products')
        .where('businessId', 'in', chunk)
        .get()
    )
  );

  return snapshots
    .flatMap((snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    .filter((product: any) => (product.isVerified === true || product.approvalStatus === 'approved') && product.status === 'active');
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

router.get('/home-feed', async (req, res) => {
  try {
    const uid = await getAuthenticatedUid(req);
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data() as any;
    const requestedSocietyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
    const societyId = requestedSocietyId || userData.societyId;

    if (!societyId) {
      return res.status(400).json({ success: false, error: 'Society not selected for user' });
    }

    await ensureSocietyDemoCatalog(societyId);

    const businessesSnapshot = await db
      .collection('businesses')
      .where('societyId', '==', societyId)
      .where('status', '==', 'active')
      .get();

    const businesses = businessesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
    const businessIds = businesses.map((business) => business.id);
    const products = await getSocietyProducts(businessIds);

    const activeOrderStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'outForDelivery']);

    const ordersSnapshot = await db
      .collection('orders')
      .where('userId', '==', uid)
      .limit(100)
      .get();

    const orders = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
    const activeOrders = orders.filter((order) => activeOrderStatuses.has(order.status)).length;

    const categoryMap = new Map<string, number>();
    businesses.forEach((business) => {
      const key = String(business.category || 'other').toLowerCase();
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + 1);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    const featuredProducts = [...products]
      .sort((a, b) => {
        const discountDiff = Number(b.discount || 0) - Number(a.discount || 0);
        if (discountDiff !== 0) return discountDiff;
        return Number(b.rating || 0) - Number(a.rating || 0);
      })
      .slice(0, 20);

    const topRatedBusinesses = [...businesses]
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
      .slice(0, 10);

    const offerProducts = featuredProducts.filter((product) => Number(product.discount || 0) > 0).slice(0, 10);

    return res.json({
      societyId,
      stats: {
        totalBusinesses: businesses.length,
        activeOrders,
        favoriteCount: Array.isArray(userData.favoriteBusinesses) ? userData.favoriteBusinesses.length : 0,
      },
      categories,
      businesses,
      featuredProducts,
      topRatedBusinesses,
      offerProducts,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to load home feed' });
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

  const normalizeRole = (role: unknown): 'superAdmin' | 'businessOwner' | 'user' | null => {
    if (typeof role !== 'string') return null;
    const compact = role.replace(/[-_\s]/g, '').toLowerCase();
    if (compact === 'superadmin') return 'superAdmin';
    if (compact === 'businessowner' || compact === 'owner' || compact === 'merchant') return 'businessOwner';
    if (compact === 'user' || compact === 'resident' || compact === 'customer') return 'user';
    return null;
  };

  let normalizedRole = normalizeRole(userData.role);

  // Repair legacy business-owner accounts that were authenticated successfully
  // but have stale or incorrect role values in Firestore.
  if (expectedRole === 'businessOwner' && normalizedRole !== 'businessOwner') {
    const ownedBusinessSnap = await db
      .collection('businesses')
      .where('ownerId', '==', authResult.localId)
      .limit(1)
      .get();

    if (!ownedBusinessSnap.empty) {
      normalizedRole = 'businessOwner';
      await Promise.all([
        db.collection('users').doc(authResult.localId).update({
          role: 'businessOwner',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        auth.setCustomUserClaims(authResult.localId, { role: 'businessOwner' }),
      ]);
      userData.role = 'businessOwner';
    }
  }

  if (normalizedRole !== expectedRole) {
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
