import { z } from "zod";
import { VALIDATION_LIMITS } from "./constants";

export const authCredentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH),
});

export const registerSchema = authCredentialsSchema.extend({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
});

export const societySchema = z.object({
  name: z.string().min(1, "Society name is required").max(200),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid PIN code"),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

export const businessSchema = z.object({
  name: z.string().min(1, "Business name is required").max(VALIDATION_LIMITS.BUSINESS_NAME_MAX),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(VALIDATION_LIMITS.BUSINESS_DESC_MAX).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  email: z.string().email().optional(),
  address: z.string().min(1, "Address is required"),
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(VALIDATION_LIMITS.PRODUCT_NAME_MAX),
  description: z.string().max(VALIDATION_LIMITS.PRODUCT_DESC_MAX).optional(),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  imageUrls: z.array(z.string().url()).max(VALIDATION_LIMITS.MAX_IMAGES_PER_PRODUCT).optional(),
});

export const addressSchema = z.object({
  type: z.enum(["home", "work", "other"]),
  name: z.string().optional(),
  street: z.string().min(1, "Street address is required"),
  landmark: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid PIN code"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  isDefault: z.boolean().default(false),
});

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be positive"),
});

export const createOrderSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  items: z.array(orderItemInputSchema).min(1, "At least one item is required"),
  deliveryAddress: z.record(z.any()),
  paymentMethod: z.enum(["cash", "card", "upi", "wallet"]),
  paymentTiming: z.enum(["atOrder", "atDelivery"]).optional(),
  notes: z.string().max(VALIDATION_LIMITS.ORDER_NOTES_MAX).optional(),
  couponCode: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "outForDelivery", "delivered", "cancelled", "rejected"]),
  notes: z.string().max(500).optional(),
  paymentCollectedMethod: z.enum(["cash", "card", "upi", "wallet"]).optional(),
  deliveryProofImageUrl: z.string().optional(),
  deliveryPartnerId: z.string().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  profileImageUrl: z.string().url().optional(),
});

export const reviewSchema = z.object({
  orderId: z.string().min(1),
  businessId: z.string().optional(),
  productId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(5).max(VALIDATION_LIMITS.REVIEW_COMMENT_MAX),
});

export const createDeliveryPartnerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const completeDeliverySchema = z.object({
  deliveryProofImageUrl: z
    .string()
    .min(1)
    .refine(
      (v) => /^https:\/\//i.test(v) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(v),
      "Must be an https URL or image data URL"
    ),
  paymentCollectedMethod: z.enum(["cash", "card", "upi", "wallet"]).optional(),
});
