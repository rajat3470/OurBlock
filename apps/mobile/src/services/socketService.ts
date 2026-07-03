/**
 * Socket.io singleton service.
 *
 * Design principles:
 * - One connection per app session, shared across all screens.
 * - Listeners registered via `on()` survive socket reconnects (same instance).
 * - Listeners registered before `connect()` is called are buffered and applied
 *   when the socket is created (handles mount-before-connect timing).
 * - Mock tokens (dev mode) skip the connection entirely so the app works
 *   without a real backend.
 * - All errors are non-fatal — the app works without the socket.
 */

import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Set EXPO_PUBLIC_SOCKET_URL in your .env to point at your Socket.io server.
// Without this, socket connection is disabled and polling fallback remains active.
const ENABLE_SOCKET = process.env.EXPO_PUBLIC_ENABLE_SOCKET === "true";
const RAW_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? "";
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/?$/, "");
const SOCKET_PATH = process.env.EXPO_PUBLIC_SOCKET_PATH ?? "/socket.io";

type AnyHandler = (data: unknown) => void;

interface BufferedListener {
  event: string;
  handler: AnyHandler;
}

interface EventCacheEntry {
  timestamp: number;
  data: unknown;
}

class SocketService {
  private socket: Socket | null = null;
  /** Listeners queued before the socket instance exists. */
  private buffer: BufferedListener[] = [];
  private warnedMissingConfig = false;
  private warnedConnectError = false;
  /** Event deduplication cache to prevent processing duplicate events */
  private eventCache = new Map<string, EventCacheEntry>();
  /** Cache TTL in milliseconds */
  private readonly CACHE_TTL = 500;
  /** Batch timer for debouncing rapid updates */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  /** Batched updates to process */
  private batchedUpdates: Map<string, AnyHandler[]> = new Map();

  private isSocketConfigured(): boolean {
    if (!ENABLE_SOCKET) return false;
    if (!SOCKET_URL) return false;
    // Firebase Functions REST endpoint is not a Socket.IO server endpoint.
    if (SOCKET_URL.includes("cloudfunctions.net")) return false;
    return true;
  }

  // ─── Connection management ───────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    if (!this.isSocketConfigured()) {
      if (process.env.NODE_ENV === 'development' && !this.warnedMissingConfig) {
        this.warnedMissingConfig = true;
        console.warn(
          "[socket] disabled: set EXPO_PUBLIC_ENABLE_SOCKET=true and EXPO_PUBLIC_SOCKET_URL=<socket-server-origin>"
        );
      }
      return;
    }

    const token = await AsyncStorage.getItem("accessToken");
    // Skip for mock tokens used in dev / demo mode.
    if (!token || token.startsWith("mock-")) return;

    // Tear down any stale disconnected socket instance before creating a new one.
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      auth: { token },
      // Use WebSocket only — avoids HTTP-polling overhead and latency
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10_000,
      timeout: 8_000,
      // Enable compression for faster data transfer
      forceNew: true,
    });

    this.socket = socket;

    // Flush any listeners that were registered before this connect() call.
    this.buffer.forEach(({ event, handler }) => socket.on(event, handler));
    this.buffer = [];

    socket.on("connect_error", (err) => {
      // Non-fatal: app works fine without real-time updates.
      if (!this.warnedConnectError) {
        this.warnedConnectError = true;
        console.warn("[socket] connect error:", err.message);
      }
    });

    socket.on("connect", () => {
      this.warnedConnectError = false;
    });
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.buffer = [];
    this.eventCache.clear();
    this.batchedUpdates.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Reconnect after the app returns to foreground.
   * If the socket instance is still alive but disconnected, it re-uses it
   * (socket.io auto-reconnect may have already fired — this is idempotent).
   * If no socket exists, a fresh connect() is performed.
   */
  async reconnect(): Promise<void> {
    if (this.socket?.connected) return;
    if (!this.isSocketConfigured()) return;

    const token = await AsyncStorage.getItem("accessToken");
    if (!token || token.startsWith("mock-")) return;

    if (this.socket) {
      // Refresh the auth token in case it was rotated while offline.
      (this.socket.auth as Record<string, unknown>).token = token;
      this.socket.connect();
    } else {
      await this.connect();
    }
  }

  // ─── Event subscription ──────────────────────────────────────────────────

  /**
   * Generate a unique cache key for event deduplication
   */
  private getEventCacheKey(event: string, data: unknown): string {
    if (typeof data === 'object' && data !== null && 'id' in data) {
      return `${event}:${String(data.id)}`;
    }
    if (typeof data === 'object' && data !== null && '_id' in data) {
      return `${event}:${String(data._id)}`;
    }
    return `${event}:${JSON.stringify(data)}`;
  }

  /**
   * Check if event is a duplicate within the cache TTL
   */
  private isDuplicateEvent(event: string, data: unknown): boolean {
    const key = this.getEventCacheKey(event, data);
    const cached = this.eventCache.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return true;
    }
    
    // Update or add to cache
    this.eventCache.set(key, { timestamp: now, data });
    
    // Clean up old entries periodically
    if (this.eventCache.size > 100) {
      const keysToDelete: string[] = [];
      this.eventCache.forEach((v, k) => {
        if (now - v.timestamp > this.CACHE_TTL) {
          keysToDelete.push(k);
        }
      });
      keysToDelete.forEach(k => this.eventCache.delete(k));
    }
    
    return false;
  }

  /**
   * Subscribe to a socket event with deduplication. Returns an unsubscribe function.
   *
   * Safe to call before connect(): handler will be applied when the socket
   * is created.
   */
  on<T = unknown>(event: string, handler: (data: T) => void): () => void {
    const typedHandler = handler as AnyHandler;

    const deduplicatedHandler = (data: unknown) => {
      // Skip duplicate events within cache TTL
      if (this.isDuplicateEvent(event, data)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[socket] deduplicated event: ${event}`);
        }
        return;
      }
      typedHandler(data);
    };

    if (this.socket) {
      this.socket.on(event, deduplicatedHandler);
    } else {
      this.buffer.push({ event, handler: deduplicatedHandler });
    }

    return () => {
      this.socket?.off(event, deduplicatedHandler);
      this.buffer = this.buffer.filter(
        (b) => !(b.event === event && b.handler === deduplicatedHandler)
      );
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
