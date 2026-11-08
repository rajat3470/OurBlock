interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  async get<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.store.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fetcher()
      .then((data) => {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
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

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }
}

export const cache = new MemoryCache();
