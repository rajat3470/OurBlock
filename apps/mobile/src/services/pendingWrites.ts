/**
 * Tracks IDs of documents that have an in-flight API write.
 * Firestore listeners check this before dispatching to avoid overwriting
 * optimistic/confirmed updates with a stale snapshot that arrives before
 * Firestore propagates the write.
 */
const pendingWrites = new Set<string>();

export function markPendingWrite(id: string) {
  pendingWrites.add(id);
}

export function clearPendingWrite(id: string) {
  pendingWrites.delete(id);
}

export function hasPendingWrite(id: string) {
  return pendingWrites.has(id);
}
