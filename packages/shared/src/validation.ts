import { z } from 'zod';
import { VALIDATION_LIMITS } from './constants';

// Auth Validation
export const authCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX_LENGTH} characters`),
});

export const registerSchema = authCredentialsSchema.extend({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
});

// Society Validation
export const societySchema = z.object({
  name: z.string().min(1, 'Society name is required').max(200),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code'),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

// Business Validation
export const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(VALIDATION_LIMITS.BUSINESS_NAME_MAX),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(VALIDATION_LIMITS.BUSINESS_DESC_MAX).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  address: z.string().min(1, 'Address is required'),
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

// Product Validation
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(VALIDATION_LIMITS.PRODUCT_NAME_MAX),
  description: z.string().max(VALIDATION_LIMITS.PRODUCT_DESC_MAX).optional(),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  originalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageUrls: z.array(z.string().url()).max(VALIDATION_LIMITS.MAX_IMAGES_PER_PRODUCT),
});

// Address Validation
export const addressSchema = z.object({
  type: z.enum(['home', 'work', 'other']),
  name: z.string().optional(),
  street: z.string().min(1, 'Street address is required'),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  isDefault: z.boolean().default(false),
});

// Order Validation
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive(),
});

export const createOrderSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  deliveryAddress: addressSchema,
  paymentMethod: z.enum(['cash', 'card', 'upi', 'wallet']),
  paymentTiming: z.enum(['atOrder', 'atDelivery']).optional(),
  notes: z.string().max(VALIDATION_LIMITS.ORDER_NOTES_MAX).optional(),
});

export const createDeliveryPartnerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(8).max(128),
});

export const completeDeliverySchema = z.object({
  deliveryProofImageUrl: z.string().url(),
  paymentCollectedMethod: z.enum(['cash', 'card', 'upi', 'wallet']).optional(),
});

// Review Validation
export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().max(100).optional(),
  comment: z.string().min(10, 'Review must be at least 10 characters').max(VALIDATION_LIMITS.REVIEW_COMMENT_MAX),
  imageUrls: z.array(z.string().url()).max(VALIDATION_LIMITS.MAX_IMAGES_PER_REVIEW).optional(),
});

// Pagination Validation
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Search Validation
export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  societyId: z.string().optional(),
});

// Update Order Status Validation
export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'outForDelivery', 'delivered', 'cancelled', 'rejected']),
  notes: z.string().max(500).optional(),
});

// User Profile Update Validation
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  profileImageUrl: z.string().url().optional(),
});

// Export all validation schemas
export const validationSchemas = {
  auth: authCredentialsSchema,
  register: registerSchema,
  society: societySchema,
  business: businessSchema,
  product: productSchema,
  address: addressSchema,
  createOrder: createOrderSchema,
  createDeliveryPartner: createDeliveryPartnerSchema,
  completeDelivery: completeDeliverySchema,
  review: reviewSchema,
  pagination: paginationSchema,
  searchQuery: searchQuerySchema,
  updateOrderStatus: updateOrderStatusSchema,
  updateProfile: updateProfileSchema,
};

// Type exports for validation schemas
export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type SocietyData = z.infer<typeof societySchema>;
export type BusinessData = z.infer<typeof businessSchema>;
export type ProductData = z.infer<typeof productSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type CreateOrderData = z.infer<typeof createOrderSchema>;
export type CreateDeliveryPartnerData = z.infer<typeof createDeliveryPartnerSchema>;
export type CompleteDeliveryData = z.infer<typeof completeDeliverySchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
