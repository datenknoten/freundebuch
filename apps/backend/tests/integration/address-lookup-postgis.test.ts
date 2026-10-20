import { parseWith } from '@datenknoten/kit/schema';
import { CityInfoResponseSchema, PostalCodeInfoResponseSchema } from '@freundebuch/shared/index.js';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  completeTestUserOnboarding,
  createBetterAuthSession,
  createTestUser,
  setupAuthTestSuite,
} from './auth.helpers.js';
import { insertTestAddresses } from './postgis.helpers.js';

/**
 * Full-stack integration tests for the address-lookup endpoints with PostGIS
 * ENABLED and real OSM-style data seeded into the test database. This exercises
 * the whole path: HTTP route -> AddressLookupService -> PostGISAddressClient ->
 * PostGIS DB (including the cities_by_postal materialized view).
 *
 * The default address-lookup.test.ts covers the PostGIS-disabled path
 * (validation + empty-list fallback); this file covers the data path.
 */
describe('Address lookup API with PostGIS (/api/address-lookup)', { timeout: 60000 }, () => {
  // PostGIS is enabled for this file only.
  const { getContext } = setupAuthTestSuite({
    POSTGIS_ADDRESS_ENABLED: 'true',
    POSTGIS_ADDRESS_DACH_ONLY: 'true',
  });

  let sessionCookies: string;

  beforeAll(async () => {
    const { pool } = getContext();

    // Seed OSM-style address data (includes the 'Unknown' placeholder that the
    // import uses for rows without an addr:city tag — must be filtered out).
    await insertTestAddresses(pool, [
      { countryCode: 'DE', postalCode: '55116', city: 'Mainz', street: 'Schillerstraße' },
      { countryCode: 'DE', postalCode: '55118', city: 'Mainz', street: 'Goethestraße' },
      { countryCode: 'DE', postalCode: '55571', city: 'Odernheim am Glan', street: 'Hauptstraße' },
      { countryCode: 'DE', postalCode: '10115', city: 'Berlin', street: 'Torstraße' },
      { countryCode: 'DE', postalCode: '10115', city: 'Unknown', street: 'Im Tal' },
      { countryCode: 'US', postalCode: '90210', city: 'Beverly Hills', street: 'Rodeo Drive' },
    ]);

    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const user = await createTestUser(pool, 'addr-postgis@test.com', passwordHash);
    await completeTestUserOnboarding(pool, user.externalId);
    sessionCookies = await createBetterAuthSession(pool, user.externalId);
  });

  afterAll(async () => {
    const { pool } = getContext();
    await pool.query('DELETE FROM geodata.addresses');
    await pool.query('DELETE FROM geodata.import_batches');
  });

  async function get(path: string) {
    const { app } = getContext();
    return app.fetch(
      new Request(`http://localhost${path}`, {
        method: 'GET',
        headers: { Cookie: sessionCookies },
      }),
    );
  }

  async function parseCities(response: Response) {
    return parseWith(CityInfoResponseSchema.array(), await response.json());
  }

  async function parsePostalCodes(response: Response) {
    return parseWith(PostalCodeInfoResponseSchema.array(), await response.json());
  }

  describe('GET /api/address-lookup/cities', () => {
    it('resolves a postal code to its city', async () => {
      const response = await get('/api/address-lookup/cities?country=DE&postal_code=55116');

      expect(response.status).toBe(200);
      expect(await parseCities(response)).toEqual([{ city: 'Mainz' }]);
    });

    it('returns multiple cities for one postal code and excludes the Unknown placeholder', async () => {
      const response = await get('/api/address-lookup/cities?country=DE&postal_code=10115');

      expect(response.status).toBe(200);
      expect((await parseCities(response)).map((c) => c.city)).toEqual(['Berlin']);
    });

    it('returns an empty list for a non-DACH country (DACH-only gate)', async () => {
      const response = await get('/api/address-lookup/cities?country=US&postal_code=90210');

      expect(response.status).toBe(200);
      expect(await parseCities(response)).toEqual([]);
    });
  });

  describe('GET /api/address-lookup/postal-codes', () => {
    it('returns postal-code/city pairs for a prefix', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=DE&prefix=55');

      expect(response.status).toBe(200);
      expect(await parsePostalCodes(response)).toEqual([
        { postalCode: '55116', city: 'Mainz' },
        { postalCode: '55118', city: 'Mainz' },
        { postalCode: '55571', city: 'Odernheim am Glan' },
      ]);
    });

    it('excludes the Unknown placeholder from prefix results', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=DE&prefix=10');

      expect(response.status).toBe(200);
      expect(await parsePostalCodes(response)).toEqual([{ postalCode: '10115', city: 'Berlin' }]);
    });

    it('returns an empty list for a non-DACH country', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=US&prefix=90');

      expect(response.status).toBe(200);
      expect(await parsePostalCodes(response)).toEqual([]);
    });
  });
});
