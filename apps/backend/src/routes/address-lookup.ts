import type { ErrorResponse } from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import { Hono } from 'hono';
import type { Logger } from 'pino';
import { authMiddleware } from '../middleware/auth.js';
import { AddressLookupService } from '../services/address-lookup.service.js';
import { SUPPORTED_COUNTRIES } from '../services/external/zipcodebase.client.js';
import type { AppContext } from '../types/context.js';
import { getConfig } from '../utils/config.js';

const app = new Hono<AppContext>();

// Apply auth middleware to all address-lookup routes
app.use('*', authMiddleware);

// Singleton service instance (lazy init)
let addressService: AddressLookupService | null = null;

function getAddressService(logger: Logger): AddressLookupService {
  if (!addressService) {
    const config = getConfig();
    if (!config.ZIPCODEBASE_API_KEY) {
      throw new Error('ZIPCODEBASE_API_KEY is not configured');
    }
    addressService = new AddressLookupService(
      config.ZIPCODEBASE_API_KEY,
      config.OVERPASS_API_URL,
      config.OVERPASS_FALLBACK_URL,
      logger,
    );
  }
  return addressService;
}

// ============================================================================
// Query Schemas
// ============================================================================

const CitiesQuerySchema = type({
  country: 'string > 0',
  postal_code: 'string > 0',
});

const StreetsQuerySchema = type({
  country: 'string > 0',
  city: 'string > 0',
  postal_code: 'string > 0',
});

const HouseNumbersQuerySchema = type({
  country: 'string > 0',
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
 * GET /api/address-lookup/cities
 * Get cities for a postal code in a country
 */
app.get('/cities', async (c) => {
  const logger = c.get('logger');
  const query = c.req.query();

  const validated = CitiesQuerySchema(query);
  if (validated instanceof type.errors) {
    return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
  }

  try {
    const service = getAddressService(logger);
    const cities = await service.getCitiesByPostalCode(validated.country, validated.postal_code);
    return c.json(cities);
  } catch (error) {
    logger.error({ error }, 'Failed to get cities');
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json<ErrorResponse>({ error: 'Address lookup service not configured' }, 503);
    }
    return c.json<ErrorResponse>({ error: 'Failed to load cities' }, 500);
  }
});

/**
 * GET /api/address-lookup/streets
 * Get streets for a city/postal code
 */
app.get('/streets', async (c) => {
  const logger = c.get('logger');
  const query = c.req.query();

  const validated = StreetsQuerySchema(query);
  if (validated instanceof type.errors) {
    return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
  }

  try {
    const service = getAddressService(logger);
    const streets = await service.getStreets(
      validated.country,
      validated.city,
      validated.postal_code,
    );
    return c.json(streets);
  } catch (error) {
    logger.error({ error }, 'Failed to get streets');
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json<ErrorResponse>({ error: 'Address lookup service not configured' }, 503);
    }
    return c.json<ErrorResponse>({ error: 'Failed to load streets' }, 500);
  }
});

/**
 * GET /api/address-lookup/house-numbers
 * Get house numbers for a street
 */
app.get('/house-numbers', async (c) => {
  const logger = c.get('logger');
  const query = c.req.query();

  const validated = HouseNumbersQuerySchema(query);
  if (validated instanceof type.errors) {
    return c.json<ErrorResponse>({ error: 'Invalid query parameters', details: validated }, 400);
  }

  try {
    const service = getAddressService(logger);
    const houseNumbers = await service.getHouseNumbers(
      validated.country,
      validated.city,
      validated.postal_code,
      validated.street,
    );
    return c.json(houseNumbers);
  } catch (error) {
    logger.error({ error }, 'Failed to get house numbers');
    if (error instanceof Error && error.message.includes('not configured')) {
      return c.json<ErrorResponse>({ error: 'Address lookup service not configured' }, 503);
    }
    return c.json<ErrorResponse>({ error: 'Failed to load house numbers' }, 500);
  }
});

export default app;

/**
 * Reset the address service singleton (useful for testing)
 */
export function resetAddressService(): void {
  addressService = null;
}
