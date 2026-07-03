/**
 * useSocketEvent — subscribe to a socket.io event with automatic cleanup.
 *
 * The handler is kept behind a ref so callers don't need useCallback — the
 * subscription itself is stable (registered once) while the handler always
 * sees the latest closure values.
 *
 * Usage:
 *   useSocketEvent<Order>("order:updated", (order) => {
 *     dispatch(updateOrderInStore(order));
 *   });
 */

import { useEffect, useRef } from "react";
import { socketService } from "../services/socketService";

export function useSocketEvent<T = unknown>(
  event: string | string[],
  handler: (data: T) => void
): void {
  // Always up-to-date without changing the identity of the stable handler below.
  const handlerRef = useRef<(data: T) => void>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (data: T) => handlerRef.current(data);
    const events = Array.isArray(event) ? event : [event];
    const unsubs = events.map((evt) => socketService.on<T>(evt, stableHandler));
    return () => {
      unsubs.forEach((u) => u());
    };
    // `event` is the only thing that should re-register the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
