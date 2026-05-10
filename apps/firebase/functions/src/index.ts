import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Import API routes
import authRoutes from './api/auth';
import adminRoutes from './api/admin';
import societyRoutes from './api/societies';
import businessRoutes from './api/businesses';
import productRoutes from './api/products';
import orderRoutes from './api/orders';
import userRoutes from './api/users';
import ownerRoutes from './api/owner';

// Use routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/societies', societyRoutes);
app.use('/businesses', businessRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/users', userRoutes);
app.use('/owner', ownerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export API
export const api = functions.https.onRequest(app);

// Export triggers
export * from './triggers/onUserCreate';
export * from './triggers/onOrderCreate';
export * from './triggers/onSocietyDelete';

// Export scheduled functions
export const dailyCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Running daily cleanup...');
    // Add cleanup logic here
    return null;
  });

