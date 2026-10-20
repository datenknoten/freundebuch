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

const StreetSchema = type({
  name: 'string',
  'type?': 'string',
});

const StreetArraySchema = type(StreetSchema, '[]');

const HouseNumberSchema = type({
  number: 'string',
  'street?': 'string',
});

const HouseNumberArraySchema = type(HouseNumberSchema, '[]');

export type StreetCached = typeof StreetSchema.infer;
export type HouseNumberCached = typeof HouseNumberSchema.infer;

type Validator<T> = (data: unknown) => T | undefined;

function validateStreets(data: unknown) {
  try {
    return StreetArraySchema.assert(data);
  } catch {
    return undefined;
  }
}

function validateHouseNumbers(data: unknown) {
  try {
    return HouseNumberArraySchema.assert(data);
  } catch {
    return undefined;
  }
}

export interface AddressCacheOptions<T> {
  /** Time-to-live in hours for cache entries */
  ttlHours: number;
  /** Maximum number of entries to keep in memory */
  maxSize: number;
  /**
   * Arktype validator applied to values read back from the database; a value
   * it rejects is treated as a miss, never as a T
   */
  validator: Validator<T>;
  /**
   * The persisted tier is always on: this cache only fronts Overpass, which is
   * queried exactly when PostGIS is not used.
   */
  db: pg.Pool;
  logger: Logger;
}

/**
 * In-memory LRU in front of a database tier, so entries survive deployments.
 */
export class AddressCache<T extends object> {
  private readonly memoryCache: LRUCache<string, T>;
  private readonly ttlMs: number;
  private readonly db: pg.Pool;
  private readonly logger: Logger;
  private readonly validator: Validator<T>;

  constructor(options: AddressCacheOptions<T>) {
    this.ttlMs = options.ttlHours * 60 * 60 * 1000;
    this.validator = options.validator;
    this.db = options.db;
    this.logger = options.logger;
    this.memoryCache = new LRUCache<string, T>({
      max: options.maxSize,
      ttl: this.ttlMs,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  public async get(key: string) {
    const memValue = this.memoryCache.get(key);
    if (memValue !== undefined) {
      return memValue;
    }

    try {
      const result = await getAddressCacheEntry.run({ cacheKey: key }, this.db);
      const row = result[0];
      if (row === undefined) {
        return undefined;
      }

      const validated = this.validator(row.cache_value);
      if (validated === undefined) {
        this.logger.warn(
          { cacheKey: key },
          'Cache value failed schema validation, discarding invalid entry',
        );
        // Delete the bad row so we don't re-read and re-reject it every
        // miss until it expires.
        await this.deleteFromDatabase(key);
        return undefined;
      }

      this.memoryCache.set(key, validated);
      return validated;
    } catch (error) {
      this.logger.error(
        { err: error, cacheKey: key },
        'Failed to read from address cache database',
      );
      return undefined;
    }
  }

  public async set(key: string, value: T) {
    this.memoryCache.set(key, value);

    try {
      const expiresAt = new Date(Date.now() + this.ttlMs);
      await upsertAddressCacheEntry.run(
        {
          cacheKey: key,
          cacheValue: JSON.stringify(value),
          expiresAt,
        },
        this.db,
      );
    } catch (error) {
      this.logger.error(
        { err: error, cacheKey: key },
        'Failed to persist to address cache database',
      );
    }
  }

  /**
   * Check if a key exists and is not expired. Consults the persisted tier as
   * well, so a key that survived a deployment in the database but not in
   * memory is not reported missing.
   */
  public async has(key: string) {
    if (this.memoryCache.has(key) === true) {
      return true;
    }

    try {
      const result = await addressCacheEntryExists.run({ cacheKey: key }, this.db);
      return result.length > 0;
    } catch (error) {
      this.logger.error({ err: error, cacheKey: key }, 'Failed to probe address cache database');
      return false;
    }
  }

  /**
   * Remove a specific key from both the memory and database tiers. Deleting
   * from memory alone would let the entry resurrect from the DB on next get().
   */
  public async delete(key: string) {
    const hasExisted = this.memoryCache.delete(key);
    await this.deleteFromDatabase(key);
    return hasExisted;
  }

  public async clear() {
    this.memoryCache.clear();
    try {
      await clearAddressCache.run(undefined, this.db);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to clear address cache database');
    }
  }

  private async deleteFromDatabase(key: string) {
    try {
      await deleteAddressCacheEntry.run({ cacheKey: key }, this.db);
    } catch (error) {
      this.logger.error(
        { err: error, cacheKey: key },
        'Failed to delete from address cache database',
      );
    }
  }

  /** Called by the cleanup scheduler. */
  public async cleanupDatabase() {
    try {
      const result = await deleteExpiredAddressCacheEntries.run(undefined, this.db);
      return result.length;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to cleanup expired address cache entries');
      return 0;
    }
  }

  public get size() {
    return this.memoryCache.size;
  }
}

const CACHE_CONFIG = {
  streets: { ttlHours: 24, maxSize: 1000 },
  houseNumbers: { ttlHours: 24, maxSize: 2000 },
};

export function createStreetsCache(
  dependencies: Pick<AddressCacheOptions<unknown>, 'db' | 'logger'>,
) {
  return new AddressCache<StreetCached[]>({
    ...CACHE_CONFIG.streets,
    validator: validateStreets,
    db: dependencies.db,
    logger: dependencies.logger.child({ module: 'address-cache' }),
  });
}

export function createHouseNumbersCache(
  dependencies: Pick<AddressCacheOptions<unknown>, 'db' | 'logger'>,
) {
  return new AddressCache<HouseNumberCached[]>({
    ...CACHE_CONFIG.houseNumbers,
    validator: validateHouseNumbers,
    db: dependencies.db,
    logger: dependencies.logger.child({ module: 'address-cache' }),
  });
}
