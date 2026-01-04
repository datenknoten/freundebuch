import { LRUCache } from 'lru-cache';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  deleteExpiredAddressCacheEntries,
  getAddressCacheEntry,
  upsertAddressCacheEntry,
} from '../models/queries/address-cache.queries.js';

// Global logger for cache operations, set during initialization
let cacheLogger: Logger | null = null;

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
          const rawValue = result[0].cache_value;

          // Type safety: validate that cached value is an object
          if (typeof rawValue !== 'object' || rawValue === null) {
            cacheLogger?.warn(
              { key, actualType: typeof rawValue },
              'Invalid cache value type, expected object',
            );
            return undefined;
          }

          const value = rawValue as T;
          // Populate memory cache
          this.memoryCache.set(key, value);
          return value;
        }
      } catch (error) {
        cacheLogger?.error(
          { error, cacheKey: key },
          'Failed to read from address cache database',
        );
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
        cacheLogger?.error(
          { error, cacheKey: key },
          'Failed to persist to address cache database',
        );
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
      cacheLogger?.error({ error }, 'Failed to cleanup expired address cache entries');
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

// Cache configuration constants
const CACHE_CONFIG = {
  countries: { ttlHours: 24 * 7, maxSize: 10 }, // Countries rarely change, cache 7 days
  cities: { ttlHours: 24, maxSize: 500 },
  streets: { ttlHours: 24, maxSize: 1000 },
  houseNumbers: { ttlHours: 24, maxSize: 2000 },
};

// Singleton instances for different cache types
let countriesCache: AddressCache<object> | null = null;
let citiesCache: AddressCache<object> | null = null;
let streetsCache: AddressCache<object> | null = null;
let houseNumbersCache: AddressCache<object> | null = null;

/**
 * Get the countries cache (must be initialized first)
 */
export function getCountriesCache<T extends object>(): AddressCache<T> {
  if (!countriesCache) {
    // Create with default config if not initialized
    countriesCache = new AddressCache<object>(CACHE_CONFIG.countries.ttlHours, CACHE_CONFIG.countries.maxSize);
  }
  return countriesCache as unknown as AddressCache<T>;
}

/**
 * Get the cities cache (must be initialized first)
 */
export function getCitiesCache<T extends object>(): AddressCache<T> {
  if (!citiesCache) {
    // Create with default config if not initialized
    citiesCache = new AddressCache<object>(CACHE_CONFIG.cities.ttlHours, CACHE_CONFIG.cities.maxSize);
  }
  return citiesCache as unknown as AddressCache<T>;
}

/**
 * Get the streets cache (must be initialized first)
 */
export function getStreetsCache<T extends object>(): AddressCache<T> {
  if (!streetsCache) {
    // Create with default config if not initialized
    streetsCache = new AddressCache<object>(CACHE_CONFIG.streets.ttlHours, CACHE_CONFIG.streets.maxSize);
  }
  return streetsCache as unknown as AddressCache<T>;
}

/**
 * Get the house numbers cache (must be initialized first)
 */
export function getHouseNumbersCache<T extends object>(): AddressCache<T> {
  if (!houseNumbersCache) {
    // Create with default config if not initialized
    houseNumbersCache = new AddressCache<object>(CACHE_CONFIG.houseNumbers.ttlHours, CACHE_CONFIG.houseNumbers.maxSize);
  }
  return houseNumbersCache as unknown as AddressCache<T>;
}

/**
 * Initialize all caches with database pool and logger.
 * This must be called at application startup to enable database persistence.
 * Caches are created eagerly to ensure they receive the pool.
 */
export function initializeAddressCaches(pool: pg.Pool, logger: Logger): void {
  cacheLogger = logger;

  // Eagerly create all caches to ensure they get the pool
  if (!countriesCache) {
    countriesCache = new AddressCache<object>(CACHE_CONFIG.countries.ttlHours, CACHE_CONFIG.countries.maxSize);
  }
  if (!citiesCache) {
    citiesCache = new AddressCache<object>(CACHE_CONFIG.cities.ttlHours, CACHE_CONFIG.cities.maxSize);
  }
  if (!streetsCache) {
    streetsCache = new AddressCache<object>(CACHE_CONFIG.streets.ttlHours, CACHE_CONFIG.streets.maxSize);
  }
  if (!houseNumbersCache) {
    houseNumbersCache = new AddressCache<object>(CACHE_CONFIG.houseNumbers.ttlHours, CACHE_CONFIG.houseNumbers.maxSize);
  }

  // Set database pool on all caches
  countriesCache.setPool(pool);
  citiesCache.setPool(pool);
  streetsCache.setPool(pool);
  houseNumbersCache.setPool(pool);

  logger.debug('Address caches initialized with database pool');
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
