import mongoose, { Schema, model, Types, Connection } from "mongoose";

const { ObjectId } = Schema.Types;

// ---------------------------------------------------------------------------
// Sub-document schemas
// ---------------------------------------------------------------------------

const AddressSchema = new Schema(
  {
    type: { type: String, enum: ["home", "work", "other"], default: "home" },
    name: String,
    street: { type: String, required: true },
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productImage: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: true }
);

const TrackingUpdateSchema = new Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: String, required: true },
    notes: String,
    rejectionReason: String,
    rejectedBy: String,
  },
  { _id: false }
);

const OneSignalButtonSchema = new Schema(
  {
    id: String,
    text: String,
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main schemas
// ---------------------------------------------------------------------------

const SocietySchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    description: String,
    imageUrl: String,
    createdBy: String,
    status: { type: String, default: "active" },
    totalUsers: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["superAdmin", "businessOwner", "user", "deliveryPartner"],
      required: true,
    },
    societyId: { type: String, index: true },
    profileImageUrl: String,
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    disabled: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
    verificationStatus: { type: String, default: null }, // businessOwner: pending|verified|rejected
    favoriteBusinesses: { type: [String], default: [] },
    pushToken: String,
    fcmToken: String, // kept for data-model parity; unused (FCM dropped)
    // Delivery-partner denormalized shop snapshot
    businessId: { type: String, index: true },
    ownerId: String,
    businessName: String,
    businessAddress: String,
    businessPhone: String,
    businessImageUrl: String,
    businessCategory: String,
    addresses: { type: [AddressSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
UserSchema.index({ societyId: 1, role: 1 });

const RefreshTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PasswordResetTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true }
);

const BusinessSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    ownerId: { type: String, required: true, unique: true, index: true },
    societyId: { type: String, required: true, index: true },
    imageUrl: String,
    bannerUrl: String,
    phone: { type: String, required: true },
    email: String,
    address: { type: String, required: true },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    isVerified: { type: Boolean, default: false },
    isTakingOrders: { type: Boolean, default: true },
    minimumOrderAmount: Number,
    estimatedDeliveryTime: String,
    preparationTime: String,
    deliveryFee: Number,
    tags: { type: [String], default: [] },
    rejectionReason: String,
    suspendedAt: Date,
    suspensionReason: String,
    recentRejections: { type: Schema.Types.Mixed, default: {} },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
BusinessSchema.index({ societyId: 1, status: 1 });
BusinessSchema.index({ category: 1 });

const ProductSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    menuSection: String,
    isVeg: Boolean,
    tags: { type: [String], default: [] },
    price: { type: Number, required: true },
    originalPrice: Number,
    discount: { type: Number, default: 0 },
    imageUrls: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    unit: String,
    unitStep: Number,
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isVerified: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvalNote: String,
    availableToday: { type: Boolean, default: true },
    attributes: Schema.Types.Mixed,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
ProductSchema.index({ businessId: 1, status: 1 });
ProductSchema.index({ businessId: 1, category: 1 });

const OrderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: String,
    userPhone: String,
    businessId: { type: String, required: true, index: true },
    businessName: String,
    subTotal: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    addressId: String,
    deliveryAddressSnapshot: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "confirmed", "preparing", "ready", "outForDelivery", "delivered", "cancelled", "rejected"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash", "card", "upi", "wallet"], required: true },
    paymentTiming: { type: String, enum: ["atOrder", "atDelivery"] },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed", "cod"], required: true },
    notes: String,
    trackingUpdates: { type: [TrackingUpdateSchema], default: [] },
    acceptanceWindowSeconds: { type: Number, default: 60 },
    autoRejectAt: Date,
    assignedDeliveryPartnerId: String,
    assignedDeliveryPartnerName: String,
    assignedAt: Date,
    deliveredAt: Date,
    deliveredBy: String,
    deliveryProofImageUrl: String,
    paymentCollectedAt: Date,
    paymentCollectedBy: String,
    paymentCollectedMethod: { type: String, enum: ["cash", "card", "upi", "wallet"] },
    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: { type: String, enum: ["business_owner", "system"] },
    refundRequested: { type: Boolean, default: false },
    items: { type: [OrderItemSchema], required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
OrderSchema.index({ businessId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, autoRejectAt: 1 });

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ["percentage", "flat", "fixed"], required: true },
    value: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: Number,
    businessId: { type: String, index: true },
    usageLimit: Number,
    usageCount: { type: Number, default: 0 },
    perUserLimit: Number,
    description: String,
    couponSource: { type: String, default: null }, // "owner" | "rewarded_ad" | null
    forUserId: { type: String, index: true, default: null },
    expiresAt: Date,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const RefundSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    businessId: { type: String, required: true, index: true },
    businessName: String,
    orderAmount: { type: Number, required: true },
    reason: { type: String, enum: ["wrong_item", "missing_item", "quality_issue", "damaged", "other"], required: true },
    comment: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "processed"], default: "pending" },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const ReviewSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    businessId: { type: String, index: true },
    productId: { type: String, index: true },
    orderId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, required: true },
    imageUrls: { type: [String], default: [] },
    verified: { type: Boolean, default: true },
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["order", "promotion", "system", "message"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: Schema.Types.Mixed,
    read: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const HomeBannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    imageUrl: { type: String, required: true },
    tagText: { type: String, default: "TRENDING IN YOUR SOCIETY" },
    ctaText: String,
    ctaRoute: String,
    societyId: { type: String, index: true, default: null }, // null/global = shown everywhere
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
    startAt: Date,
    endAt: Date,
    theme: Schema.Types.Mixed,
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const ChatSessionSchema = new Schema(
  {
    businessId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    businessOwnerId: { type: String, required: true, index: true },
    businessName: String,
    lastMessage: Schema.Types.Mixed,
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
ChatSessionSchema.index({ businessId: 1, userId: 1 }, { unique: true });

const MessageSchema = new Schema(
  {
    chatSessionId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "file"], default: "text" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const AdRewardClaimSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    count: { type: Number, default: 0 },
    lastClaimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
AdRewardClaimSchema.index({ userId: 1, date: 1 }, { unique: true });

const SuspensionHistorySchema = new Schema(
  {
    action: { type: String, enum: ["suspended", "activated"], required: true },
    entityType: { type: String, default: "business" },
    entityId: { type: String, required: true, index: true },
    entityName: String,
    ownerId: String,
    reason: String,
    performedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export const Society = model("Society", SocietySchema);
export const User = model("User", UserSchema);
export const RefreshToken = model("RefreshToken", RefreshTokenSchema);
export const PasswordResetToken = model("PasswordResetToken", PasswordResetTokenSchema);
export const Business = model("Business", BusinessSchema);
export const Product = model("Product", ProductSchema);
export const Order = model("Order", OrderSchema);
export const Coupon = model("Coupon", CouponSchema);
export const Refund = model("Refund", RefundSchema);
export const Review = model("Review", ReviewSchema);
export const Notification = model("Notification", NotificationSchema);
export const HomeBanner = model("HomeBanner", HomeBannerSchema);
export const ChatSession = model("ChatSession", ChatSessionSchema);
export const Message = model("Message", MessageSchema);
export const AdRewardClaim = model("AdRewardClaim", AdRewardClaimSchema);
export const SuspensionHistory = model("SuspensionHistory", SuspensionHistorySchema);

// Map-friendly export for route/service convenience.
export const models = {
  Society,
  User,
  RefreshToken,
  PasswordResetToken,
  Business,
  Product,
  Order,
  Coupon,
  Refund,
  Review,
  Notification,
  HomeBanner,
  ChatSession,
  Message,
  AdRewardClaim,
  SuspensionHistory,
};

export { mongoose, Types, Connection };

let cachedConnection: typeof mongoose | null = null;

export async function connectDB(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (cachedConnection) return cachedConnection;
  if (!uri) throw new Error("MONGODB_URI is not defined");

  const conn = await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });

  // Build indexes defined in schemas. Safe to run on startup; existing indexes
  // are skipped and any new ones are created.
  if (process.env.SYNC_INDEXES !== "false") {
    await Promise.all(
      Object.values(models).map(async (model) => {
        try {
          await (model as any).syncIndexes();
        } catch (err) {
          // Best-effort: log but do not fail server startup. Common failures are
          // duplicate key errors during concurrent startup; index will exist.
          console.warn("syncIndexes warning for", (model as any).modelName, ":", err);
        }
      })
    );
  }

  cachedConnection = conn;
  console.log(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  return conn;
}

export async function disconnectDB(): Promise<void> {
  if (cachedConnection) {
    await cachedConnection.disconnect();
    cachedConnection = null;
  }
}
