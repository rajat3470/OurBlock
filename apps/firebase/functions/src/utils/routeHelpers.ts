import {Response} from "express";
import * as admin from "firebase-admin";

/**
 * Convert a Firestore document snapshot to a plain object with its `id`.
 */
export function docToJson(doc: FirebaseFirestore.DocumentSnapshot): Record<string, any> {
  return {id: doc.id, ...doc.data()};
}

/**
 * Convert every document in a query snapshot to plain objects with `id`.
 */
export function docsToJson(snapshot: FirebaseFirestore.QuerySnapshot): Record<string, any>[] {
  return snapshot.docs.map((doc) => docToJson(doc));
}

/**
 * Parse `page` and `limit` from Express query params with sensible defaults and bounds.
 */
export function parsePagination(
  query: Record<string, any>,
  defaults: { limit?: number; maxLimit?: number } = {}
): { page: number; limit: number } {
  const {limit: defaultLimit = 20, maxLimit = 100} = defaults;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return {page, limit};
}

/**
 * Normalize role strings to canonical casing.
 */
export function normalizeRole(role: unknown): "superAdmin" | "businessOwner" | "user" | null {
  if (typeof role !== "string") return null;
  const compact = role.replace(/[-_\s]/g, "").toLowerCase();
  if (compact === "superadmin") return "superAdmin";
  if (compact === "businessowner" || compact === "owner" || compact === "merchant") return "businessOwner";
  if (compact === "user" || compact === "customer" || compact === "resident") return "user";
  return null;
}

/**
 * Handle common Firebase Auth errors during user creation and send appropriate responses.
 * Returns `true` if an error was handled (response sent), `false` otherwise.
 */
export function handleFirebaseAuthError(res: Response, error: any): boolean {
  if (error.code === "auth/email-already-exists") {
    res.status(409).json({success: false, error: "An account with this email already exists"});
    return true;
  }
  if (error.code === "auth/phone-number-already-exists") {
    res.status(409).json({success: false, error: "This phone number is already registered"});
    return true;
  }
  return false;
}

/**
 * Build a map of societyId → business count from all businesses.
 */
export async function buildBusinessCountMap(
  db: admin.firestore.Firestore
): Promise<Record<string, number>> {
  const businessSnap = await db.collection("businesses").get();
  const countMap: Record<string, number> = {};
  businessSnap.docs.forEach((doc) => {
    const sid = doc.data().societyId as string | undefined;
    if (sid) countMap[sid] = (countMap[sid] ?? 0) + 1;
  });
  return countMap;
}
