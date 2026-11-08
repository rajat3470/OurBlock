type CacheEntry<T> = { data: T; fetchedAt: number };

class DataCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  /**
   * Returns cached data if younger than `maxAgeMs`, otherwise calls `fetcher`.
   * Concurrent calls to the same key share a single inflight request.
   */
  async get<T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.fetchedAt < maxAgeMs) {
      return cached.data as T;
    }

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fetcher()
      .then((data) => {
        this.store.set(key, { data, fetchedAt: Date.now() });
        this.inflight.delete(key);
        return data;
      })
      .catch((err) => {
        this.inflight.delete(key);
        throw err;
      });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Returns cached data without fetching, or null if stale/missing. */
  peek<T>(key: string, maxAgeMs: number): T | null {
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.fetchedAt < maxAgeMs) {
      return cached.data as T;
    }
    return null;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }
}

export const dataCache = new DataCache();
