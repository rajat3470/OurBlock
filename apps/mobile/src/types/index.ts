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
  CLOTHING = "clothing",
  HARDWARE = "hardware",
  CAFE = "cafe",
  SALON = "salon",
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
export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number; // percentage
  imageUrls: string[];
  stock: number;
  rating?: number;
  totalReviews?: number;
  status: "active" | "inactive";
  isVerified?: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
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
}

export interface Order {
  id: string;
  userId: string;
  businessId: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount: number;
  deliveryAddress: Address;
  status: OrderStatus;
  paymentMethod: "cash" | "card" | "upi" | "wallet";
  paymentStatus: "pending" | "completed" | "failed";
  notes?: string;
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
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
