import { LRUCache } from 'lru-cache';
import type pg from 'pg';
import {
  deleteExpiredAddressCacheEntries,
  getAddressCacheEntry,
  upsertAddressCacheEntry,
} from '../models/queries/address-cache.queries.js';

/**
 * Persistent cache with LRU eviction and database backing.
 * Uses in-memory LRU cache for fast access with database persistence
 * to survive deployments.
 */
export class AddressCache<T extends object> {
  private memoryCache: LRUCache<string, T>;
  private ttlMs: number;
  private pool: pg.Pool | null = null;

  /**
   * Create a new cache instance
   * @param ttlHours Time-to-live in hours for cache entries
   * @param maxSize Maximum number of entries to keep in memory (default: 1000)
   */
  constructor(ttlHours: number, maxSize = 1000) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
    this.memoryCache = new LRUCache<string, T>({
      max: maxSize,
      ttl: this.ttlMs,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  /**
   * Set the database pool for persistence
   * Must be called before using database-backed features
   */
  setPool(pool: pg.Pool): void {
    this.pool = pool;
  }

  /**
   * Get a value from cache (memory first, then database)
   */
  async get(key: string): Promise<T | undefined> {
    // Check memory cache first
    const memValue = this.memoryCache.get(key);
    if (memValue !== undefined) {
      return memValue;
    }

    // Fall back to database if pool is available
    if (this.pool) {
      try {
        const result = await getAddressCacheEntry.run({ cacheKey: key }, this.pool);
        if (result.length > 0) {
          const value = result[0].cache_value as T;
          // Populate memory cache
          this.memoryCache.set(key, value);
          return value;
        }
      } catch (error) {
        // Log but don't fail - cache miss is acceptable
        console.error('Failed to read from address cache database:', error);
      }
    }

    return undefined;
  }

  /**
   * Store a value in cache (both memory and database)
   */
  async set(key: string, value: T): Promise<void> {
    // Always set in memory cache
    this.memoryCache.set(key, value);

    // Persist to database if pool is available
    if (this.pool) {
      try {
        const expiresAt = new Date(Date.now() + this.ttlMs);
        await upsertAddressCacheEntry.run(
          {
            cacheKey: key,
            cacheValue: JSON.stringify(value),
            expiresAt,
          },
          this.pool,
        );
      } catch (error) {
        // Log but don't fail - memory cache is primary
        console.error('Failed to persist to address cache database:', error);
      }
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  /**
   * Clear all entries from memory cache
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Remove all expired entries from database.
   * Called by the cleanup scheduler.
   */
  async cleanupDatabase(): Promise<number> {
    if (!this.pool) {
      return 0;
    }

    try {
      const result = await deleteExpiredAddressCacheEntries.run(undefined, this.pool);
      return result.length;
    } catch (error) {
      console.error('Failed to cleanup expired address cache entries:', error);
      return 0;
    }
  }

  /**
   * Get the current size of the memory cache
   */
  get size(): number {
    return this.memoryCache.size;
  }
}

// Singleton instances for different cache types
let countriesCache: AddressCache<object> | null = null;
let citiesCache: AddressCache<object> | null = null;
let streetsCache: AddressCache<object> | null = null;
let houseNumbersCache: AddressCache<object> | null = null;

/**
 * Get or create the countries cache
 */
export function getCountriesCache<T extends object>(ttlHours: number): AddressCache<T> {
  if (!countriesCache) {
    // Countries change rarely, cache for 7 days
    countriesCache = new AddressCache<object>(ttlHours * 7, 10);
  }
  return countriesCache as unknown as AddressCache<T>;
}

/**
 * Get or create the cities cache
 */
export function getCitiesCache<T extends object>(ttlHours: number): AddressCache<T> {
  if (!citiesCache) {
    citiesCache = new AddressCache<object>(ttlHours, 500);
  }
  return citiesCache as unknown as AddressCache<T>;
}

/**
 * Get or create the streets cache
 */
export function getStreetsCache<T extends object>(ttlHours: number): AddressCache<T> {
  if (!streetsCache) {
    streetsCache = new AddressCache<object>(ttlHours, 1000);
  }
  return streetsCache as unknown as AddressCache<T>;
}

/**
 * Get or create the house numbers cache
 */
export function getHouseNumbersCache<T extends object>(ttlHours: number): AddressCache<T> {
  if (!houseNumbersCache) {
    houseNumbersCache = new AddressCache<object>(ttlHours, 2000);
  }
  return houseNumbersCache as unknown as AddressCache<T>;
}

/**
 * Initialize all caches with database pool
 */
export function initializeAddressCaches(pool: pg.Pool): void {
  countriesCache?.setPool(pool);
  citiesCache?.setPool(pool);
  streetsCache?.setPool(pool);
  houseNumbersCache?.setPool(pool);
}

/**
 * Cleanup expired entries from all address caches
 */
export async function cleanupAllAddressCaches(): Promise<void> {
  const caches = [countriesCache, citiesCache, streetsCache, houseNumbersCache];
  for (const cache of caches) {
    if (cache) {
      await cache.cleanupDatabase();
    }
  }
}
