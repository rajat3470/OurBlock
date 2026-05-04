import { Router } from 'express';
import * as admin from 'firebase-admin';
import { validationSchemas } from '../shared/validation';

const router = Router();
const auth = admin.auth();
const db = admin.firestore();

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

export default router;
