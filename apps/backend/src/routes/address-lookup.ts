import { ValidationError } from '@datenknoten/kit';
import { type } from 'arktype';
import { Hono, type MiddlewareHandler } from 'hono';
import type { AddressLookupService } from '../services/address-lookup.service.js';
import type { AppContext } from '../types/context.js';

// ============================================================================
// Query Schemas
// ============================================================================

// ISO-3166-1 alpha-2 country code. Restricting the shape here is the primary
// guard against Overpass QL injection via the country parameter (the value is
// interpolated into the upstream query string).
const CountryCode = type(/^[A-Za-z]{2}$/);

const CitiesQuerySchema = type({
  country: CountryCode,
  postal_code: 'string > 0',
});

// Postal-code prefix for autocomplete. Constrained to alphanumerics/space/dash
// (real postal-code characters) so it is safe to interpolate into a SQL LIKE
// prefix, and at least 2 chars to keep short-prefix scans cheap.
const PostalCodesQuerySchema = type({
  country: CountryCode,
  prefix: type(/^[A-Za-z0-9 -]{2,10}$/),
});

const StreetsQuerySchema = type({
  country: CountryCode,
  city: 'string > 0',
  postal_code: 'string > 0',
});

const HouseNumbersQuerySchema = type({
  country: CountryCode,
  city: 'string > 0',
  postal_code: 'string > 0',
  street: 'string > 0',
});

export interface AddressLookupRoutesOptions {
  addressLookupService: AddressLookupService;
  authMiddleware: MiddlewareHandler<AppContext>;
  onboardingMiddleware: MiddlewareHandler<AppContext>;
  rateLimitMiddleware: MiddlewareHandler<AppContext>;
}

export function createAddressLookupRoutes(options: AddressLookupRoutesOptions) {
  const { addressLookupService, authMiddleware, onboardingMiddleware, rateLimitMiddleware } =
    options;
  const app = new Hono<AppContext>();

  // Apply auth middleware to all address-lookup routes
  app.use('*', authMiddleware);
  // Apply onboarding middleware to require profile
  app.use('*', onboardingMiddleware);
  // Bound outbound geocoder traffic per client (Overpass/Nominatim usage policies
  // apply per deployment IP).
  app.use('*', rateLimitMiddleware);

  // ============================================================================
  // Routes
  // ============================================================================

  /**
   * GET /api/address-lookup/postal-codes
   * Search postal codes by prefix (autocomplete). Returns postal-code/city pairs.
   */
  app.get('/postal-codes', async (c) => {
    const query = c.req.query();

    const validated = PostalCodesQuerySchema(query);
    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const postalCodes = await addressLookupService.searchPostalCodes(
      validated.country,
      validated.prefix,
    );
    return c.json(postalCodes);
  });

  /**
   * GET /api/address-lookup/cities
   * Get cities for a postal code in a country
   */
  app.get('/cities', async (c) => {
    const query = c.req.query();

    const validated = CitiesQuerySchema(query);
    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const cities = await addressLookupService.getCitiesByPostalCode(
      validated.country,
      validated.postal_code,
    );
    return c.json(cities);
  });

  /**
   * GET /api/address-lookup/streets
   * Get streets for a city/postal code
   */
  app.get('/streets', async (c) => {
    const query = c.req.query();

    const validated = StreetsQuerySchema(query);
    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const streets = await addressLookupService.getStreets(
      validated.country,
      validated.city,
      validated.postal_code,
    );
    return c.json(streets);
  });

  /**
   * GET /api/address-lookup/house-numbers
   * Get house numbers for a street
   */
  app.get('/house-numbers', async (c) => {
    const query = c.req.query();

    const validated = HouseNumbersQuerySchema(query);
    if (validated instanceof type.errors) {
      throw new ValidationError('Invalid query parameters', validated);
    }

    const houseNumbers = await addressLookupService.getHouseNumbers(
      validated.country,
      validated.city,
      validated.postal_code,
      validated.street,
    );
    return c.json(houseNumbers);
  });

  return app;
}
