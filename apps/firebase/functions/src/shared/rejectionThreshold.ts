const ONE_HOUR_MS = 60 * 60 * 1000;

type TimestampLike = Date | { toDate?: () => Date } | { seconds: number; nanoseconds?: number };

type RejectionEventLike =
  | TimestampLike
  | null
  | undefined
  | { timestamp?: TimestampLike | null | undefined; userId?: string | null };

const toDate = (value: TimestampLike | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof (value as { seconds?: number }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
};

export interface RejectionWindowEvaluation {
  recentTimestamps: Date[];
  recentCount: number;
  shouldBlock: boolean;
  windowStart: Date;
}

export const evaluateRejectionWindow = (
  events: RejectionEventLike[],
  now: TimestampLike | null | undefined,
  userId?: string | null
): RejectionWindowEvaluation => {
  const normalizedNow = toDate(now) ?? new Date();
  const windowStart = new Date(normalizedNow.getTime() - ONE_HOUR_MS);

  const recentTimestamps = events
    .filter((event) => {
      if (!userId) return true;
      if (event && typeof event === 'object' && !('getTime' in event) && 'userId' in event) {
        return (event as { userId?: string | null }).userId === userId;
      }
      return true;
    })
    .map((event) => {
      if (event && typeof event === 'object' && !('getTime' in event) && 'timestamp' in event) {
        const timestamp = toDate((event as { timestamp?: TimestampLike | null | undefined }).timestamp);
        return timestamp ?? null;
      }
      return toDate(event as TimestampLike | null | undefined);
    })
    .filter((ts): ts is Date => ts !== null)
    .filter((ts) => ts >= windowStart && ts <= normalizedNow)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    recentTimestamps,
    recentCount: recentTimestamps.length,
    shouldBlock: recentTimestamps.length >= 5,
    windowStart,
  };
};
