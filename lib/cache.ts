// Simple in-memory cache for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const maxAge = ttl || this.defaultTTL;

    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache HIT for ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`Cache SET for ${key}`);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`Cache INVALIDATED for ${key}`);
  }

  clear(): void {
    this.cache.clear();
    console.log('Cache CLEARED');
  }
}

export const cache = new SimpleCache();
