// Role Types
export type UserRole = "superAdmin" | "businessOwner" | "user";

// Common Timestamps
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// User Types
export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description?: string;
  imageUrl?: string;
  createdBy: string; // SuperAdmin ID
  metadata?: Record<string, any>;
  status: "active" | "inactive";
  totalBusinesses?: number;
  totalUsers?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  societyId?: string;
  profileImageUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
}

export interface SuperAdmin extends User {
  role: "superAdmin";
  permissions: string[];
}

export interface BusinessOwner extends User {
  role: "businessOwner";
  societyId: string;
  businessId: string;
  verificationStatus: "pending" | "verified" | "rejected";
  identificationNumber?: string;
  identificationImageUrl?: string;
  rejectionHistory?: RejectionRecord[];
  suspendedAt?: Date;
  suspensionReason?: string;
}

export interface RejectionRecord {
  userId?: string | null;
  timestamp: Date;
  orderId: string;
}

export interface AppUser extends User {
  role: "user";
  societyId: string;
  favoriteBusinesses?: string[];
  addresses?: Address[];
}

// Business Types
export enum BusinessCategory {
  GROCERY = "grocery",
  PHARMACY = "pharmacy",
  RESTAURANT = "restaurant",
  ELECTRONICS = "electronics",
  HARDWARE = "hardware",
  CAFE = "cafe",
  GYM = "gym",
  OTHER = "other",
}

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  description?: string;
  ownerId: string;
  societyId: string;
  imageUrl?: string;
  bannerUrl?: string;
  phone: string;
  email?: string;
  address: string;
  rating?: number;
  totalReviews?: number;
  operatingHours?: OperatingHours;
  status: "active" | "inactive" | "suspended";
  isVerified: boolean;
  // Real-time availability / business overrides
  isTakingOrders?: boolean;
  minimumOrderAmount?: number;
  estimatedDeliveryTime?: string;
  preparationTime?: string;
  deliveryFee?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string; // "09:00"
  close: string; // "21:00"
  isClosed?: boolean;
}

// Product Types
export type ProductUnit = "piece" | "g" | "kg" | "ml" | "L";

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string;
  menuSection?: string; // e.g. "Starters", "Main Course", "Beverages"
  isVeg?: boolean;      // true = veg (green dot), false = non-veg (red dot)
  tags?: string[];      // e.g. ["bestseller", "recommended", "new", "spicy"]
  price: number;
  originalPrice?: number;
  discount?: number; // percentage
  imageUrls: string[];
  stock: number;
  unit?: ProductUnit;    // unit of measure — default "piece"
  unitStep?: number;    // purchasable increment in that unit (e.g. 100 for 100g)
  rating?: number;
  totalReviews?: number;
  status: "active" | "inactive";
  isVerified?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNote?: string;
  availableToday?: boolean;
  attributes?: ProductAttribute[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

// Order Types
export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  OUT_FOR_DELIVERY = "outForDelivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

export interface Order {
  id: string;
  userId: string;
  businessId: string;
  businessName?: string;
  items: OrderItem[];
  subTotal?: number;
  platformFee?: number;
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount: number;
  deliveryAddress: Address;
  status: OrderStatus;
  paymentMethod: "cash" | "card" | "upi" | "wallet";
  paymentStatus: "pending" | "completed" | "failed" | "cod";
  notes?: string;
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
  rejectionReason?: string;          // If order was rejected by business owner / system
  rejectedAt?: Date;                  // Timestamp of rejection
  rejectedBy?: "business_owner" | "system";
  acceptanceWindowSeconds?: number;   // Owner accept/reject window (seconds)
  autoRejectAt?: any;                 // Deadline after which a pending order is auto-rejected
  trackingUpdates?: TrackingUpdate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  attributes?: ProductAttribute[];
}

export interface TrackingUpdate {
  status: OrderStatus;
  timestamp: Date;
  location?: string;
  notes?: string;
  rejectionReason?: string;
  rejectedBy?: "business_owner" | "system";
}

// Address Types
export interface Address {
  id: string;
  userId: string;
  type: "home" | "work" | "other";
  name?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Review & Rating Types
export interface Review {
  id: string;
  userId: string;
  businessId?: string;
  productId?: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  imageUrls?: string[];
  verified: boolean; // Purchased from platform
  helpful?: number;
  notHelpful?: number;
  response?: ReviewResponse;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  respondentId: string; // Business owner
  comment: string;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: "order" | "promotion" | "system" | "message";
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrls?: string[];
  type: "text" | "image" | "file";
  read: boolean;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Home Banner Types
export interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  tagText?: string;
  ctaText?: string;
  ctaRoute?: string;
  societyId: string;
  isActive: boolean;
  sortOrder?: number;
  startAt?: Date | null;
  endAt?: Date | null;
  theme?: {
    accentStart?: string;
    accentEnd?: string;
    textColor?: string;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Order Payload Types
export interface CreateOrderPayload {
  businessId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  deliveryAddress: Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">;
  notes?: string;
  paymentMethod: "cash" | "upi";
  couponCode?: string;
}

// Authentication Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthToken;
}

// Error Response
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
