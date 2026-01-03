interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support.
 * Used for caching external API responses to reduce rate limiting issues.
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  /**
   * Create a new cache instance
   * @param ttlHours Time-to-live in hours for cache entries
   */
  constructor(ttlHours: number) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Store a value in the cache
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove all expired entries from cache.
   * Can be called periodically to free memory.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the current size of the cache (including expired entries)
   */
  get size(): number {
    return this.cache.size;
  }
}
