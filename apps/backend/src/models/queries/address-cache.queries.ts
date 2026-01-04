/** Types generated for queries found in "src/models/queries/address-cache.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'GetAddressCacheEntry' parameters type */
export interface IGetAddressCacheEntryParams {
  cacheKey: string;
}

/** 'GetAddressCacheEntry' return type */
export interface IGetAddressCacheEntryResult {
  /** Cache key (e.g., "countries", "cities:DE:12345") */
  cache_key: string;
  /** Cached JSON data from external API */
  cache_value: Json;
  /** When this cache entry expires */
  expires_at: Date;
}

/** 'GetAddressCacheEntry' query type */
export interface IGetAddressCacheEntryQuery {
  params: IGetAddressCacheEntryParams;
  result: IGetAddressCacheEntryResult;
}

const getAddressCacheEntryIR: any = {"usedParamSet":{"cacheKey":true},"params":[{"name":"cacheKey","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":95}]}],"statement":"SELECT cache_key, cache_value, expires_at\nFROM system.address_cache\nWHERE cache_key = :cacheKey!\n  AND expires_at > NOW()"};

/**
 * Query generated from SQL:
 * ```
 * SELECT cache_key, cache_value, expires_at
 * FROM system.address_cache
 * WHERE cache_key = :cacheKey!
 *   AND expires_at > NOW()
 * ```
 */
export const getAddressCacheEntry = new PreparedQuery<IGetAddressCacheEntryParams,IGetAddressCacheEntryResult>(getAddressCacheEntryIR);


/** 'UpsertAddressCacheEntry' parameters type */
export interface IUpsertAddressCacheEntryParams {
  cacheKey: string;
  cacheValue: Json;
  expiresAt: DateOrString;
}

/** 'UpsertAddressCacheEntry' return type */
export type IUpsertAddressCacheEntryResult = void;

/** 'UpsertAddressCacheEntry' query type */
export interface IUpsertAddressCacheEntryQuery {
  params: IUpsertAddressCacheEntryParams;
  result: IUpsertAddressCacheEntryResult;
}

const upsertAddressCacheEntryIR: any = {"usedParamSet":{"cacheKey":true,"cacheValue":true,"expiresAt":true},"params":[{"name":"cacheKey","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":87}]},{"name":"cacheValue","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":101}]},{"name":"expiresAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":104,"b":114}]}],"statement":"INSERT INTO system.address_cache (cache_key, cache_value, expires_at)\nVALUES (:cacheKey!, :cacheValue!, :expiresAt!)\nON CONFLICT (cache_key)\nDO UPDATE SET\n  cache_value = EXCLUDED.cache_value,\n  expires_at = EXCLUDED.expires_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO system.address_cache (cache_key, cache_value, expires_at)
 * VALUES (:cacheKey!, :cacheValue!, :expiresAt!)
 * ON CONFLICT (cache_key)
 * DO UPDATE SET
 *   cache_value = EXCLUDED.cache_value,
 *   expires_at = EXCLUDED.expires_at
 * ```
 */
export const upsertAddressCacheEntry = new PreparedQuery<IUpsertAddressCacheEntryParams,IUpsertAddressCacheEntryResult>(upsertAddressCacheEntryIR);


/** 'DeleteExpiredAddressCacheEntries' parameters type */
export type IDeleteExpiredAddressCacheEntriesParams = void;

/** 'DeleteExpiredAddressCacheEntries' return type */
export type IDeleteExpiredAddressCacheEntriesResult = void;

/** 'DeleteExpiredAddressCacheEntries' query type */
export interface IDeleteExpiredAddressCacheEntriesQuery {
  params: IDeleteExpiredAddressCacheEntriesParams;
  result: IDeleteExpiredAddressCacheEntriesResult;
}

const deleteExpiredAddressCacheEntriesIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE FROM system.address_cache\nWHERE expires_at < NOW()"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM system.address_cache
 * WHERE expires_at < NOW()
 * ```
 */
export const deleteExpiredAddressCacheEntries = new PreparedQuery<IDeleteExpiredAddressCacheEntriesParams,IDeleteExpiredAddressCacheEntriesResult>(deleteExpiredAddressCacheEntriesIR);


/** 'ClearAddressCache' parameters type */
export type IClearAddressCacheParams = void;

/** 'ClearAddressCache' return type */
export type IClearAddressCacheResult = void;

/** 'ClearAddressCache' query type */
export interface IClearAddressCacheQuery {
  params: IClearAddressCacheParams;
  result: IClearAddressCacheResult;
}

const clearAddressCacheIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE FROM system.address_cache"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM system.address_cache
 * ```
 */
export const clearAddressCache = new PreparedQuery<IClearAddressCacheParams,IClearAddressCacheResult>(clearAddressCacheIR);


