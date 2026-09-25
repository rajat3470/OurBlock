import content from "@/content/boProducts.json";
import { type ProductUnit } from "@utils/helpers";

export interface CategoryMetadata {
  value: string;
  label: string;
  emoji?: string;
  allowedBusinessTypes: string[];
  supportsDietary: boolean;
  supportsMenuSection: boolean;
  defaultUnit: ProductUnit;
  allowedUnits: ProductUnit[];
  requiresUnitStep: boolean;
  unitStepPresets?: Record<string, { label: string; value: string }[]>;
  quickAddStockValues: number[];
  supportsAttributes: boolean;
  defaultAttributes?: { name: string; values: string[] }[];
}

const CATEGORIES = content.categories as unknown as CategoryMetadata[];

export function getCategoryMetadata(value: string): CategoryMetadata | undefined {
  return CATEGORIES.find((c) => c.value === value);
}

export function getCategoryLabel(value: string): string {
  return getCategoryMetadata(value)?.label ?? value;
}

export function getCategoryEmoji(value: string): string {
  return getCategoryMetadata(value)?.emoji ?? "🏷️";
}

export function categorySupportsDietary(value: string | undefined): boolean {
  if (!value) return false;
  return getCategoryMetadata(value)?.supportsDietary ?? false;
}

/**
 * Returns ALL categories, sorted so the ones relevant to the business type
 * appear first (recommended), followed by the rest. Nothing is removed.
 */
export function getCategoriesForBusinessType(businessCategory?: string): CategoryMetadata[] {
  if (!businessCategory) return [...CATEGORIES];

  const recommended: CategoryMetadata[] = [];
  const others: CategoryMetadata[] = [];

  for (const cat of CATEGORIES) {
    const isRelevant =
      cat.allowedBusinessTypes.includes(businessCategory) ||
      cat.allowedBusinessTypes.includes("*") ||
      cat.value === "general" ||
      cat.value === "other";
    if (isRelevant) {
      recommended.push(cat);
    } else {
      others.push(cat);
    }
  }

  return [...recommended, ...others];
}

/**
 * Check if a category is recommended for a given business type.
 */
export function isCategoryRecommended(categoryValue: string, businessCategory?: string): boolean {
  if (!businessCategory) return false;
  const meta = getCategoryMetadata(categoryValue);
  if (!meta) return false;
  return (
    meta.allowedBusinessTypes.includes(businessCategory) ||
    meta.allowedBusinessTypes.includes("*") ||
    meta.value === "general" ||
    meta.value === "other"
  );
}

export function getAllCategories(): CategoryMetadata[] {
  return [...CATEGORIES];
}
