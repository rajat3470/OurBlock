// Ported verbatim from apps/firebase/functions/src/shared/constants.ts
// (see BACKEND_FLOW_DOCUMENTATION.md §9 for audit notes on discrepancies).

export const ORDER_ACCEPTANCE_WINDOW_SECONDS = 60;
export const ORDER_AUTO_REJECT_REASON = "Store didn't respond within the 60-second window";

export const ORDER_FEES = {
  PLATFORM_FEE: 2,
  MINIMUM_ORDER: 50,
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: "superAdmin",
  BUSINESS_OWNER: "businessOwner",
  USER: "user",
  DELIVERY_PARTNER: "deliveryPartner",
} as const;

export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  WALLET: "wallet",
} as const;

export const PAYMENT_TIMING = {
  AT_ORDER: "atOrder",
  AT_DELIVERY: "atDelivery",
} as const;

export const isPaymentOutstanding = (paymentStatus?: string | null): boolean =>
  paymentStatus === "pending" || paymentStatus === "cod";

export const BUSINESS_CATEGORIES = [
  { value: "dairy", label: "Dairy & Daily Essentials" },
  { value: "groceries", label: "Groceries" },
  { value: "food", label: "Food & Beverages" },
  { value: "home_services", label: "Home Services" },
  { value: "personal_care", label: "Personal Care" },
  { value: "education", label: "Education" },
  { value: "pet_care", label: "Pet Care" },
  { value: "preowned", label: "Pre-owned Items" },
  { value: "laundry", label: "Laundry & Dry Cleaning" },
  { value: "plants", label: "Plants & Gardening" },
  { value: "events", label: "Event Services" },
  { value: "other", label: "Other" },
] as const;

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

export const BLACKLIST_REJECTION_LIMIT = 5;
export const BLACKLIST_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const REFUND_WINDOW_HOURS = 48;

export const AD_REWARD = {
  MAX_CLAIMS_PER_DAY: 1,
  REWARD_MIN_RS: 2,
  REWARD_MAX_RS: 5,
};

export const DELIVERY_QUEUE = {
  QUEUE_STATUS_LIST: ["confirmed", "preparing", "ready", "outForDelivery"] as const,
  ACTIONABLE_STATUSES: new Set(["ready", "outForDelivery"]),
  DELIVERY_QUEUE_LIMIT: 40,
};

/** Super-admin email allowlist fallback (env-configurable). */
export function getSuperAdminEmailAllowlist(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS || "ankushrishi5@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function normalizeRole(
  role: unknown
): "superAdmin" | "businessOwner" | "user" | "deliveryPartner" | null {
  if (typeof role !== "string") return null;
  const compact = role.replace(/[-_\s]/g, "").toLowerCase();
  if (compact === "superadmin") return "superAdmin";
  if (compact === "businessowner" || compact === "owner" || compact === "merchant") return "businessOwner";
  if (compact === "user" || compact === "resident" || compact === "customer") return "user";
  if (compact === "deliverypartner" || compact === "delivery" || compact === "rider") return "deliveryPartner";
  return null;
}
