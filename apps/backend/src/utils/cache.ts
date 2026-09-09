import { type } from 'arktype';
import { LRUCache } from 'lru-cache';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  addressCacheEntryExists,
  clearAddressCache,
  deleteAddressCacheEntry,
  deleteExpiredAddressCacheEntries,
  getAddressCacheEntry,
  upsertAddressCacheEntry,
} from '../models/queries/address-cache.queries.js';

// Global logger for cache operations, set during initialization
let cacheLogger: Logger | null = null;

// ============================================================================
// Arktype schemas for cached data validation
// ============================================================================

/**
 * Schema for Street from Overpass API
 */
const StreetSchema = type({
  name: 'string',
  'type?': 'string',
});

const StreetArraySchema = type(StreetSchema, '[]');

/**
 * Schema for HouseNumber from Overpass API
 */
const HouseNumberSchema = type({
  number: 'string',
  'street?': 'string',
});

const HouseNumberArraySchema = type(HouseNumberSchema, '[]');

/**
 * Countries are a static list served as a plain object; only its shape as an
 * object is contractual, so that is all the validator asserts.
 */
const CountriesSchema = type('object');

// Type aliases for the validated types
export type StreetCached = typeof StreetSchema.infer;
export type HouseNumberCached = typeof HouseNumberSchema.infer;

// Validator function type
type Validator<T> = (data: unknown) => T | undefined;

/**
 * Create a validator function from an arktype schema
 */
function createValidator<T>(
  schema: { assert: (data: unknown) => T },
  typeName: string,
): Validator<T> {
  return (data: unknown): T | undefined => {
    try {
      return schema.assert(data);
    } catch (error) {
      cacheLogger?.warn(
        { error, typeName },
        'Cache value failed schema validation, discarding invalid entry',
      );
      return undefined;
    }
  };
}

// Pre-built validators for each cache type
const validators = {
  countries: createValidator(CountriesSchema, 'object'),
  streets: createValidator(StreetArraySchema, 'Street[]'),
  houseNumbers: createValidator(HouseNumberArraySchema, 'HouseNumber[]'),
};

/**
 * Persistent cache with LRU eviction and database backing.
 * Uses in-memory LRU cache for fast access with database persistence
 * to survive deployments.
 */
export class AddressCache<T extends object> {
  private memoryCache: LRUCache<string, T>;
  private ttlMs: number;
  private pool: pg.Pool | null = null;
  private validator: Validator<T>;

  /**
   * Create a new cache instance
   * @param ttlHours Time-to-live in hours for cache entries
   * @param maxSize Maximum number of entries to keep in memory
   * @param validator Arktype validator applied to values read back from the
   *   database; a value it rejects is treated as a miss, never as a T
   */
  constructor(ttlHours: number, maxSize: number, validator: Validator<T>) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
    this.validator = validator;
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
   *
   * The persisted tier is always on: this cache only fronts Overpass, which is
   * queried exactly when PostGIS is not used.
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

    const pool = this.pool;
    if (pool === null) {
      return undefined;
    }

    try {
      const result = await getAddressCacheEntry.run({ cacheKey: key }, pool);
      const row = result[0];
      if (row === undefined) {
        return undefined;
      }

      const validated = this.validator(row.cache_value);
      if (validated === undefined) {
        // Validation failed (log already happened in the validator).
        // Delete the bad row so we don't re-read and re-reject it every
        // miss until it expires.
        await this.deleteFromDatabase(key);
        return undefined;
      }

      // Populate memory cache with validated value
      this.memoryCache.set(key, validated);
      return validated;
    } catch (error) {
      cacheLogger?.error({ error, cacheKey: key }, 'Failed to read from address cache database');
      return undefined;
    }
  }

  /**
   * Store a value in cache (both memory and database)
   */
  async set(key: string, value: T): Promise<void> {
    // Always set in memory cache
    this.memoryCache.set(key, value);

    const pool = this.pool;
    if (pool === null) {
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + this.ttlMs);
      await upsertAddressCacheEntry.run(
        {
          cacheKey: key,
          cacheValue: JSON.stringify(value),
          expiresAt,
        },
        pool,
      );
    } catch (error) {
      cacheLogger?.error({ error, cacheKey: key }, 'Failed to persist to address cache database');
    }
  }

  /**
   * Check if a key exists and is not expired. Consults the persisted tier as
   * well, so a key that survived a deployment in the database but not in
   * memory is not reported missing.
   */
  async has(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) {
      return true;
    }

    const pool = this.pool;
    if (pool === null) {
      return false;
    }

    try {
      const result = await addressCacheEntryExists.run({ cacheKey: key }, pool);
      return result.length > 0;
    } catch (error) {
      cacheLogger?.error({ error, cacheKey: key }, 'Failed to probe address cache database');
      return false;
    }
  }

  /**
   * Remove a specific key from both the memory and database tiers. Deleting
   * from memory alone would let the entry resurrect from the DB on next get().
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.memoryCache.delete(key);
    await this.deleteFromDatabase(key);
    return existed;
  }

  /**
   * Clear all entries from both the memory and database tiers.
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.pool) {
      try {
        await clearAddressCache.run(undefined, this.pool);
      } catch (error) {
        cacheLogger?.error({ error }, 'Failed to clear address cache database');
      }
    }
  }

  /** Best-effort delete of a single key from the database tier. */
  private async deleteFromDatabase(key: string): Promise<void> {
    if (!this.pool) {
      return;
    }
    try {
      await deleteAddressCacheEntry.run({ cacheKey: key }, this.pool);
    } catch (error) {
      cacheLogger?.error({ error, cacheKey: key }, 'Failed to delete from address cache database');
    }
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
  streets: { ttlHours: 24, maxSize: 1000 },
  houseNumbers: { ttlHours: 24, maxSize: 2000 },
};

// Singleton instances for different cache types
let countriesCache: AddressCache<object> | null = null;
let streetsCache: AddressCache<StreetCached[]> | null = null;
let houseNumbersCache: AddressCache<HouseNumberCached[]> | null = null;

/**
 * Get the countries cache (must be initialized first)
 */
export function getCountriesCache(): AddressCache<object> {
  if (!countriesCache) {
    countriesCache = new AddressCache<object>(
      CACHE_CONFIG.countries.ttlHours,
      CACHE_CONFIG.countries.maxSize,
      validators.countries,
    );
  }
  return countriesCache;
}

/**
 * Get the streets cache with arktype validation
 */
export function getStreetsCache(): AddressCache<StreetCached[]> {
  if (!streetsCache) {
    streetsCache = new AddressCache<StreetCached[]>(
      CACHE_CONFIG.streets.ttlHours,
      CACHE_CONFIG.streets.maxSize,
      validators.streets,
    );
  }
  return streetsCache;
}

/**
 * Get the house numbers cache with arktype validation
 */
export function getHouseNumbersCache(): AddressCache<HouseNumberCached[]> {
  if (!houseNumbersCache) {
    houseNumbersCache = new AddressCache<HouseNumberCached[]>(
      CACHE_CONFIG.houseNumbers.ttlHours,
      CACHE_CONFIG.houseNumbers.maxSize,
      validators.houseNumbers,
    );
  }
  return houseNumbersCache;
}

/**
 * Initialize all caches with database pool and logger.
 * This must be called at application startup to enable database persistence.
 * Caches are created eagerly to ensure they receive the pool.
 */
export function initializeAddressCaches(pool: pg.Pool, logger: Logger): void {
  cacheLogger = logger;

  // Eagerly create all caches with validators to ensure they get the pool
  if (!countriesCache) {
    countriesCache = new AddressCache<object>(
      CACHE_CONFIG.countries.ttlHours,
      CACHE_CONFIG.countries.maxSize,
      validators.countries,
    );
  }
  if (!streetsCache) {
    streetsCache = new AddressCache<StreetCached[]>(
      CACHE_CONFIG.streets.ttlHours,
      CACHE_CONFIG.streets.maxSize,
      validators.streets,
    );
  }
  if (!houseNumbersCache) {
    houseNumbersCache = new AddressCache<HouseNumberCached[]>(
      CACHE_CONFIG.houseNumbers.ttlHours,
      CACHE_CONFIG.houseNumbers.maxSize,
      validators.houseNumbers,
    );
  }

  // Set database pool on all caches
  countriesCache.setPool(pool);
  streetsCache.setPool(pool);
  houseNumbersCache.setPool(pool);

  logger.debug('Address caches initialized with database pool and arktype validators');
}
