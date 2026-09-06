/* @name getAddressCacheEntry */
SELECT cache_key, cache_value, expires_at
FROM system.address_cache
WHERE cache_key = :cacheKey!
  AND expires_at > NOW();

/* @name addressCacheEntryExists */
SELECT 1 AS present
FROM system.address_cache
WHERE cache_key = :cacheKey!
  AND expires_at > NOW();

/* @name upsertAddressCacheEntry */
INSERT INTO system.address_cache (cache_key, cache_value, expires_at)
VALUES (:cacheKey!, :cacheValue!, :expiresAt!)
ON CONFLICT (cache_key)
DO UPDATE SET
  cache_value = EXCLUDED.cache_value,
  expires_at = EXCLUDED.expires_at;

/* @name deleteExpiredAddressCacheEntries */
DELETE FROM system.address_cache
WHERE expires_at < NOW();

/* @name deleteAddressCacheEntry */
DELETE FROM system.address_cache
WHERE cache_key = :cacheKey!;

/* @name clearAddressCache */
DELETE FROM system.address_cache;

/* @name TrimAddressCache */
-- Hard bound on the persisted tier: the geocoder cache is a convenience, so
-- keep the 50k most recently written keys and drop the rest.
DELETE FROM system.address_cache
WHERE id IN (
  SELECT id FROM system.address_cache ORDER BY updated_at DESC OFFSET 50000
);
