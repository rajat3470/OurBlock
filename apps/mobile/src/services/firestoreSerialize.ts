/**
 * Recursively convert Firestore Timestamp values into ISO 8601 strings so that
 * snapshot data is Redux-serializable.
 */
export function serializeFirestoreValue(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);

  // Firestore Timestamp has a `toDate` method and a `seconds` property.
  const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybeTimestamp.toDate === "function" && typeof maybeTimestamp.seconds === "number") {
    return maybeTimestamp.toDate().toISOString();
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      serializeFirestoreValue(val),
    ])
  );
}
