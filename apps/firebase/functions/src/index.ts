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
app.use(express.json());

// Import API routes
import authRoutes from './api/auth';
import societyRoutes from './api/societies';
import businessRoutes from './api/businesses';
import productRoutes from './api/products';
import orderRoutes from './api/orders';
import userRoutes from './api/users';

// Use routes
app.use('/auth', authRoutes);
app.use('/societies', societyRoutes);
app.use('/businesses', businessRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export API
export const api = functions.https.onRequest(app);

// Export triggers
export * from './triggers/onUserCreate';
export * from './triggers/onOrderCreate';

// Export scheduled functions
export const dailyCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Running daily cleanup...');
    // Add cleanup logic here
    return null;
  });

