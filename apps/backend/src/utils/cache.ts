import { type } from 'arktype';
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

// ============================================================================
// Arktype schemas for cached data validation
// ============================================================================

/**
 * Schema for ZipcodeResult from ZipcodeBase API
 */
const ZipcodeResultSchema = type({
  postal_code: 'string',
  city: 'string',
  'state?': 'string',
  'state_code?': 'string',
  'province?': 'string',
  country_code: 'string',
  'latitude?': 'string',
  'longitude?': 'string',
});

const ZipcodeResultArraySchema = type(ZipcodeResultSchema, '[]');

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

// Type aliases for the validated types
export type ZipcodeResultCached = typeof ZipcodeResultSchema.infer;
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
  cities: createValidator(ZipcodeResultArraySchema, 'ZipcodeResult[]'),
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
  private validator: Validator<T> | null;

  /**
   * Create a new cache instance
   * @param ttlHours Time-to-live in hours for cache entries
   * @param maxSize Maximum number of entries to keep in memory (default: 1000)
   * @param validator Optional arktype validator for deserializing from database
   */
  constructor(ttlHours: number, maxSize = 1000, validator: Validator<T> | null = null) {
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

          // Validate with arktype if validator is available
          if (this.validator) {
            const validated = this.validator(rawValue);
            if (validated === undefined) {
              // Validation failed, log already happened in validator
              return undefined;
            }
            // Populate memory cache with validated value
            this.memoryCache.set(key, validated);
            return validated;
          }

          // Fallback: basic type check if no validator
          if (typeof rawValue !== 'object' || rawValue === null) {
            cacheLogger?.warn(
              { key, actualType: typeof rawValue },
              'Invalid cache value type, expected object',
            );
            return undefined;
          }

          const value = rawValue as T;
          this.memoryCache.set(key, value);
          return value;
        }
      } catch (error) {
        cacheLogger?.error({ error, cacheKey: key }, 'Failed to read from address cache database');
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
        cacheLogger?.error({ error, cacheKey: key }, 'Failed to persist to address cache database');
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
let citiesCache: AddressCache<ZipcodeResultCached[]> | null = null;
let streetsCache: AddressCache<StreetCached[]> | null = null;
let houseNumbersCache: AddressCache<HouseNumberCached[]> | null = null;

/**
 * Get the countries cache (must be initialized first)
 * Note: Countries use a static list, no validation needed
 */
export function getCountriesCache<T extends object>(): AddressCache<T> {
  if (!countriesCache) {
    countriesCache = new AddressCache<object>(
      CACHE_CONFIG.countries.ttlHours,
      CACHE_CONFIG.countries.maxSize,
    );
  }
  return countriesCache as unknown as AddressCache<T>;
}

/**
 * Get the cities cache with arktype validation
 */
export function getCitiesCache<T extends object>(): AddressCache<T> {
  if (!citiesCache) {
    citiesCache = new AddressCache<ZipcodeResultCached[]>(
      CACHE_CONFIG.cities.ttlHours,
      CACHE_CONFIG.cities.maxSize,
      validators.cities,
    );
  }
  return citiesCache as unknown as AddressCache<T>;
}

/**
 * Get the streets cache with arktype validation
 */
export function getStreetsCache<T extends object>(): AddressCache<T> {
  if (!streetsCache) {
    streetsCache = new AddressCache<StreetCached[]>(
      CACHE_CONFIG.streets.ttlHours,
      CACHE_CONFIG.streets.maxSize,
      validators.streets,
    );
  }
  return streetsCache as unknown as AddressCache<T>;
}

/**
 * Get the house numbers cache with arktype validation
 */
export function getHouseNumbersCache<T extends object>(): AddressCache<T> {
  if (!houseNumbersCache) {
    houseNumbersCache = new AddressCache<HouseNumberCached[]>(
      CACHE_CONFIG.houseNumbers.ttlHours,
      CACHE_CONFIG.houseNumbers.maxSize,
      validators.houseNumbers,
    );
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

  // Eagerly create all caches with validators to ensure they get the pool
  if (!countriesCache) {
    countriesCache = new AddressCache<object>(
      CACHE_CONFIG.countries.ttlHours,
      CACHE_CONFIG.countries.maxSize,
    );
  }
  if (!citiesCache) {
    citiesCache = new AddressCache<ZipcodeResultCached[]>(
      CACHE_CONFIG.cities.ttlHours,
      CACHE_CONFIG.cities.maxSize,
      validators.cities,
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
  citiesCache.setPool(pool);
  streetsCache.setPool(pool);
  houseNumbersCache.setPool(pool);

  logger.debug('Address caches initialized with database pool and arktype validators');
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
