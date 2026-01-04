/* @name getAddressCacheEntry */
SELECT cache_key, cache_value, expires_at
FROM public.address_cache
WHERE cache_key = :cacheKey!
  AND expires_at > NOW();

/* @name upsertAddressCacheEntry */
INSERT INTO public.address_cache (cache_key, cache_value, expires_at, updated_at)
VALUES (:cacheKey!, :cacheValue!, :expiresAt!, NOW())
ON CONFLICT (cache_key)
DO UPDATE SET
  cache_value = EXCLUDED.cache_value,
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

/* @name deleteExpiredAddressCacheEntries */
DELETE FROM public.address_cache
WHERE expires_at < NOW();

/* @name clearAddressCache */
DELETE FROM public.address_cache;
