import type pg from 'pg';
import type { Logger } from 'pino';
import { getConfig } from '../utils/config.js';
import { AddressLookupService } from './address-lookup.service.js';
import { PostGISAddressClient } from './external/postgis-address.client.js';

/**
 * Process-wide singletons for address lookup.
 *
 * These live in the service layer rather than in `routes/address-lookup.ts`
 * because services depend on them (AddressService geocodes in the background);
 * a route module importing from another route module put the dependency arrow
 * backwards.
 */
let addressLookupService: AddressLookupService | null = null;
let postgisClient: PostGISAddressClient | null = null;

/**
 * Get the AddressLookupService singleton for geocoding.
 *
 * Address lookup depends on no API key (PostGIS + Overpass + Nominatim), so
 * there is always an instance to return.
 */
export function getAddressLookupService(pool: pg.Pool, logger: Logger): AddressLookupService {
  if (!addressLookupService) {
    const config = getConfig();
    if (config.POSTGIS_ADDRESS_ENABLED && !postgisClient) {
      postgisClient = new PostGISAddressClient(pool, logger);
    }
    addressLookupService = new AddressLookupService(
      {
        overpassPrimaryUrl: config.OVERPASS_API_URL,
        overpassFallbackUrl: config.OVERPASS_FALLBACK_URL,
        postgisClient: config.POSTGIS_ADDRESS_ENABLED ? (postgisClient ?? undefined) : undefined,
        postgisEnabled: config.POSTGIS_ADDRESS_ENABLED,
        postgisDachOnly: config.POSTGIS_ADDRESS_DACH_ONLY,
        nominatimContactEmail: config.NOMINATIM_CONTACT_EMAIL,
      },
      logger,
    );
  }
  return addressLookupService;
}

/**
 * Reset the address service singletons (useful for testing)
 */
export function resetAddressService(): void {
  addressLookupService = null;
  postgisClient = null;
}
