// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Firebase Configuration
export const FIREBASE_CONFIG = {
  COLLECTIONS: {
    USERS: 'users',
    SOCIETIES: 'societies',
    BUSINESSES: 'businesses',
    PRODUCTS: 'products',
    ORDERS: 'orders',
    REVIEWS: 'reviews',
    NOTIFICATIONS: 'notifications',
    ADDRESSES: 'addresses',
    MESSAGES: 'messages',
    CHAT_SESSIONS: 'chatSessions',
  },
  STORAGE: {
    PROFILES: 'profiles',
    BUSINESSES: 'businesses',
    PRODUCTS: 'products',
    REVIEWS: 'reviews',
    IDENTIFICATIONS: 'identifications',
  },
};

// Order Status Flow
export const ORDER_STATUS_FLOW = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['outForDelivery'],
  outForDelivery: ['delivered'],
  delivered: [],
  cancelled: [],
  rejected: [],
} as const;

// Seconds a business owner has to accept/reject a new order before it is
// auto-rejected by the system. Keep the mobile countdown in sync with this.
export const ORDER_ACCEPTANCE_WINDOW_SECONDS = 60;

// Reason recorded on orders auto-rejected because the owner did not respond.
export const ORDER_AUTO_REJECT_REASON = "Store didn't respond within the 60-second window";

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'superAdmin',
  BUSINESS_OWNER: 'businessOwner',
  USER: 'user',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
  WALLET: 'wallet',
} as const;

// Business Categories
export const BUSINESS_CATEGORIES = [
  { value: 'dairy', label: 'Dairy & Daily Essentials' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'food', label: 'Food & Beverages' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'education', label: 'Education' },
  { value: 'pet_care', label: 'Pet Care' },
  { value: 'preowned', label: 'Pre-owned Items' },
  { value: 'laundry', label: 'Laundry & Dry Cleaning' },
  { value: 'plants', label: 'Plants & Gardening' },
  { value: 'events', label: 'Event Services' },
  { value: 'other', label: 'Other' },
] as const;

// Pagination
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

// Order Fees
export const ORDER_FEES = {
  PLATFORM_FEE: 2,
  MINIMUM_ORDER: 50,
} as const;

// Validation Constraints
export const VALIDATION_LIMITS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_LENGTH: 10,
  PIN_CODE_LENGTH: 6,
  PRODUCT_NAME_MAX: 200,
  PRODUCT_DESC_MAX: 2000,
  BUSINESS_NAME_MAX: 100,
  BUSINESS_DESC_MAX: 1000,
  REVIEW_COMMENT_MAX: 1000,
  ORDER_NOTES_MAX: 500,
  MAX_IMAGES_PER_PRODUCT: 5,
  MAX_IMAGES_PER_REVIEW: 3,
};

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_PRODUCT: 5,
  MAX_IMAGES_PER_REVIEW: 3,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
  MESSAGE: 'message',
} as const;

// Status Values
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SOCIETY_NOT_FOUND: 'SOCIETY_NOT_FOUND',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;
