import { type } from 'arktype';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { onboardingMiddleware } from '../middleware/onboarding.js';
import { addressLookupRateLimitMiddleware } from '../middleware/rate-limit.js';
import { getAddressLookupService } from '../services/address-lookup.registry.js';
import type { AppContext } from '../types/context.js';
import { SUPPORTED_COUNTRIES } from '../utils/countries.js';
import { ValidationError } from '../utils/errors.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all address-lookup routes
app.use('*', authMiddleware);
// Apply onboarding middleware to require profile
app.use('*', onboardingMiddleware);
// Bound outbound geocoder traffic per client (Overpass/Nominatim usage policies
// apply per deployment IP).
app.use('*', addressLookupRateLimitMiddleware);

// Singletons live in services/address-lookup.registry.ts: services depend on
// them too, and a route module is the wrong owner for that.

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

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/address-lookup/countries
 * Get list of supported countries
 * Note: Uses static list, doesn't require API key
 */
app.get('/countries', (c) => {
  return c.json(SUPPORTED_COUNTRIES);
});

/**
 * GET /api/address-lookup/postal-codes
 * Search postal codes by prefix (autocomplete). Returns postal-code/city pairs.
 */
app.get('/postal-codes', async (c) => {
  const logger = c.get('logger');
  const pool = c.get('db');
  const query = c.req.query();

  const validated = PostalCodesQuerySchema(query);
  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const service = getAddressLookupService(pool, logger);
  const postalCodes = await service.searchPostalCodes(validated.country, validated.prefix);
  return c.json(postalCodes);
});

/**
 * GET /api/address-lookup/cities
 * Get cities for a postal code in a country
 */
app.get('/cities', async (c) => {
  const logger = c.get('logger');
  const pool = c.get('db');
  const query = c.req.query();

  const validated = CitiesQuerySchema(query);
  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const service = getAddressLookupService(pool, logger);
  const cities = await service.getCitiesByPostalCode(validated.country, validated.postal_code);
  return c.json(cities);
});

/**
 * GET /api/address-lookup/streets
 * Get streets for a city/postal code
 */
app.get('/streets', async (c) => {
  const logger = c.get('logger');
  const pool = c.get('db');
  const query = c.req.query();

  const validated = StreetsQuerySchema(query);
  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const service = getAddressLookupService(pool, logger);
  const streets = await service.getStreets(
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
  const logger = c.get('logger');
  const pool = c.get('db');
  const query = c.req.query();

  const validated = HouseNumbersQuerySchema(query);
  if (validated instanceof type.errors) {
    throw new ValidationError('Invalid query parameters', validated);
  }

  const service = getAddressLookupService(pool, logger);
  const houseNumbers = await service.getHouseNumbers(
    validated.country,
    validated.city,
    validated.postal_code,
    validated.street,
  );
  return c.json(houseNumbers);
});

export default app;
