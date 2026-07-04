import { Order, OrderStatus } from "../types";

/** Default owner accept/reject window, mirrors ORDER_ACCEPTANCE_WINDOW_SECONDS on the backend. */
export const ORDER_ACCEPTANCE_WINDOW_SECONDS = 60;

/**
 * Best-effort conversion of the many shapes a timestamp can arrive in
 * (Date, ms number, seconds number, ISO string, or a serialized Firestore
 * Timestamp like `{ _seconds }` / `{ seconds }`) into epoch milliseconds.
 * Returns null when the value can't be interpreted.
 */
export function toMillis(value: unknown): number | null {
  if (value == null) return null;

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Heuristic: values below ~10^12 are seconds, above are milliseconds.
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }

  if (typeof value === "object") {
    const obj = value as { seconds?: number; _seconds?: number };
    const seconds = obj.seconds ?? obj._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }

  return null;
}

/**
 * Epoch-ms deadline after which a still-pending order is auto-rejected.
 * Prefers the server-stamped `autoRejectAt`; falls back to
 * `createdAt + acceptanceWindowSeconds`. Returns null when neither is usable
 * (e.g. legacy orders without the field) so callers can skip the countdown.
 */
export function getAcceptanceDeadlineMs(order: Pick<Order, "autoRejectAt" | "acceptanceWindowSeconds" | "createdAt">): number | null {
  const explicit = toMillis(order.autoRejectAt);
  if (explicit != null) return explicit;

  const createdMs = toMillis(order.createdAt as unknown);
  if (createdMs == null) return null;

  const windowSec = order.acceptanceWindowSeconds ?? ORDER_ACCEPTANCE_WINDOW_SECONDS;
  return createdMs + windowSec * 1000;
}

/**
 * Whole seconds remaining before auto-rejection (clamped to >= 0), or null when
 * there is no usable deadline. `nowMs` is injectable for testing / shared ticks.
 */
export function getRemainingSeconds(
  order: Pick<Order, "autoRejectAt" | "acceptanceWindowSeconds" | "createdAt">,
  nowMs: number = Date.now()
): number | null {
  const deadline = getAcceptanceDeadlineMs(order);
  if (deadline == null) return null;
  return Math.max(0, Math.ceil((deadline - nowMs) / 1000));
}

/** True when a pending order's acceptance window has lapsed on the client clock. */
export function isAcceptanceExpired(
  order: Pick<Order, "autoRejectAt" | "acceptanceWindowSeconds" | "createdAt" | "status">,
  nowMs: number = Date.now()
): boolean {
  if (order.status !== OrderStatus.PENDING) return false;
  const remaining = getRemainingSeconds(order, nowMs);
  return remaining !== null && remaining <= 0;
}

/** Formats remaining seconds as `M:SS` (or `SS s` under a minute). */
export function formatRemaining(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${seconds}s`;
}
