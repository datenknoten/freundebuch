/* @name getAddressCacheEntry */
SELECT cache_key, cache_value, expires_at
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

/* @name clearAddressCache */
DELETE FROM system.address_cache;
