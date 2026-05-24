// Order Fees
export const ORDER_FEES = {
  PLATFORM_FEE: 2,
  MINIMUM_ORDER: 50,
} as const;

// Business Categories
export const BUSINESS_CATEGORIES = {
  GROCERY: "grocery",
  PHARMACY: "pharmacy",
  RESTAURANT: "restaurant",
  ELECTRONICS: "electronics",
  HARDWARE: "hardware",
  CAFE: "cafe",
  GYM: "gym",
  OTHER: "other",
};

export const BUSINESS_CATEGORY_LABELS = {
  grocery: "🛒 Grocery",
  pharmacy: "💊 Pharmacy",
  restaurant: "🍽️ Restaurant",
  electronics: "📱 Electronics",
  hardware: "🔨 Hardware",
  cafe: "☕ Cafe",
  gym: "🏋️ Gym",
  other: "📦 Other",
};

// Order Status
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  OUT_FOR_DELIVERY: "outForDelivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  outForDelivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: "superAdmin",
  BUSINESS_OWNER: "businessOwner",
  USER: "user",
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  WALLET: "wallet",
};

export const PAYMENT_METHOD_LABELS = {
  cash: "Cash on Delivery",
  card: "Credit/Debit Card",
  upi: "UPI",
  wallet: "Wallet",
};

// Address Types
export const ADDRESS_TYPES = {
  HOME: "home",
  WORK: "work",
  OTHER: "other",
};

// Review Ratings
export const RATING_OPTIONS = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
];

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers.",
  INVALID_PHONE: "Please enter a valid phone number.",
  INVALID_PINCODE: "Please enter a valid 6-digit pincode.",
  REQUIRED_FIELD: "This field is required.",
  PASSWORDS_NOT_MATCH: "Passwords do not match.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful!",
  REGISTRATION_SUCCESS: "Registration successful!",
  PASSWORD_RESET_SUCCESS: "Password reset successful!",
  PROFILE_UPDATE_SUCCESS: "Profile updated successfully!",
  ORDER_PLACED_SUCCESS: "Order placed successfully!",
  PAYMENT_SUCCESS: "Payment successful!",
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH_TOKEN: "/auth/refresh-token",
  },
  // Societies
  SOCIETIES: "/societies",
  // Businesses
  BUSINESSES: "/businesses",
  // Products
  PRODUCTS: "/products",
  // Orders
  ORDERS: "/orders",
  // Users
  USERS: "/users",
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;

// Timeouts
export const API_TIMEOUT = 30000; // 30 seconds
export const DEBOUNCE_DELAY = 300; // 300ms
