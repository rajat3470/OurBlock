// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // Minimum 8 characters, at least one uppercase, one lowercase, one digit
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/; // India format
  return phoneRegex.test(phone);
};

export const validatePincode = (pincode: string): boolean => {
  const pincodeRegex = /^\d{6}$/; // 6 digit pincode
  return pincodeRegex.test(pincode);
};

// Formatting utilities
export const formatPrice = (price: number, currency: string = "₹"): string => {
  return `${currency}${price.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// String utilities
export const truncateString = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + "..." : str;
};

// ─── Weight / unit utilities ────────────────────────────────────────────────

export type ProductUnit = "piece" | "g" | "kg" | "ml" | "L";

/**
 * Short label for one purchasable step.
 * e.g. unit="g", unitStep=100 → "100g"
 *      unit="kg", unitStep=0.25 → "0.25kg"
 *      unit="piece" → ""
 */
export function unitStepLabel(unit?: ProductUnit | string, unitStep?: number): string {
  if (!unit || unit === "piece") return "";
  const step = unitStep ?? 1;
  if (unit === "g") return step >= 1000 ? `${step / 1000}kg` : `${step}g`;
  if (unit === "kg") return `${step}kg`;
  if (unit === "ml") return step >= 1000 ? `${step / 1000}L` : `${step}ml`;
  if (unit === "L") return `${step}L`;
  return "";
}

/**
 * Display total quantity in cart.
 * e.g. qty=3, unit="g", unitStep=100 → "300g"
 *      qty=3, unit="kg", unitStep=0.5 → "1.5kg"
 *      qty=3, unit="piece" → "3"
 */
export function displayQuantity(qty: number, unit?: ProductUnit | string, unitStep?: number): string {
  if (!unit || unit === "piece") return `${qty}`;
  const total = qty * (unitStep ?? 1);
  if (unit === "g") return total >= 1000 ? `${+(total / 1000).toFixed(2)}kg` : `${total}g`;
  if (unit === "kg") return `${+total.toFixed(2)}kg`;
  if (unit === "ml") return total >= 1000 ? `${+(total / 1000).toFixed(2)}L` : `${total}ml`;
  if (unit === "L") return `${+total.toFixed(2)}L`;
  return `${qty}`;
}

/**
 * Maximum number of steps a customer can add to cart.
 * For weight items: Math.floor(stock / unitStep).
 */
export function maxCartSteps(stock: number, unit?: ProductUnit | string, unitStep?: number): number {
  if (!unit || unit === "piece") return stock;
  return Math.floor(stock / (unitStep ?? 1));
}

/**
 * Stock badge info for display.
 * Returns label, whether stock is low, and whether it's out.
 */
export function stockBadgeInfo(
  stock: number,
  unit?: ProductUnit | string,
  unitStep?: number
): { label: string; isLow: boolean; isOut: boolean } {
  const steps = maxCartSteps(stock, unit, unitStep);
  if (steps <= 0) return { label: "Out of Stock", isLow: false, isOut: true };
  if (!unit || unit === "piece") {
    return {
      label: steps <= 5 ? `Only ${steps} left` : "In Stock",
      isLow: steps <= 5,
      isOut: false,
    };
  }
  let display: string;
  if (unit === "g") display = stock < 1000 ? `${stock}g` : `${+(stock / 1000).toFixed(2)}kg`;
  else if (unit === "kg") display = `${+stock.toFixed(2)}kg`;
  else if (unit === "ml") display = stock < 1000 ? `${stock}ml` : `${+(stock / 1000).toFixed(2)}L`;
  else display = `${+stock.toFixed(2)}L`;
  return { label: `${display} left`, isLow: steps <= 3, isOut: false };
}

export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toCamelCase = (str: string): string => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  });
};

// Number utilities
export const calculateDiscount = (
  originalPrice: number,
  discountPercent: number
): number => {
  return originalPrice - (originalPrice * discountPercent) / 100;
};

export const calculateTax = (amount: number, taxPercent: number = 18): number => {
  return (amount * taxPercent) / 100;
};

// Array utilities
export const removeDuplicates = <T,>(arr: T[]): T[] => {
  return [...new Set(arr)];
};

export const groupBy = <T,>(arr: T[], key: keyof T): Record<string, T[]> => {
  return arr.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};
