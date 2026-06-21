import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resetAddressService } from '../../src/routes/address-lookup.js';
import { resetConfig } from '../../src/utils/config.js';
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
describe('Address Lookup API - PostGIS full-stack', { timeout: 60000 }, () => {
  const { getContext } = setupAuthTestSuite();

  let sessionCookies: string;

  beforeAll(async () => {
    // Enable PostGIS for this file only. The address service is created lazily
    // on first request, so toggling the env + clearing the singleton here takes
    // effect before any request is made.
    vi.stubEnv('POSTGIS_ADDRESS_ENABLED', 'true');
    vi.stubEnv('POSTGIS_ADDRESS_DACH_ONLY', 'true');
    resetConfig();
    resetAddressService();

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
    resetAddressService();
  });

  function get(path: string) {
    const { app } = getContext();
    return app.fetch(
      new Request(`http://localhost${path}`, {
        method: 'GET',
        headers: { Cookie: sessionCookies },
      }),
    );
  }

  describe('GET /cities (PostGIS-backed)', () => {
    it('resolves a postal code to its city', async () => {
      const response = await get('/api/address-lookup/cities?country=DE&postal_code=55116');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ city: string }>;
      expect(body).toEqual([{ city: 'Mainz' }]);
    });

    it('returns multiple cities for one postal code and excludes the Unknown placeholder', async () => {
      const response = await get('/api/address-lookup/cities?country=DE&postal_code=10115');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ city: string }>;
      expect(body.map((c) => c.city)).toEqual(['Berlin']);
    });

    it('returns an empty list for a non-DACH country (DACH-only gate)', async () => {
      const response = await get('/api/address-lookup/cities?country=US&postal_code=90210');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ city: string }>;
      expect(body).toEqual([]);
    });
  });

  describe('GET /postal-codes (PostGIS-backed)', () => {
    it('returns postal-code/city pairs for a prefix', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=DE&prefix=55');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ postalCode: string; city: string }>;
      expect(body).toEqual([
        { postalCode: '55116', city: 'Mainz' },
        { postalCode: '55118', city: 'Mainz' },
        { postalCode: '55571', city: 'Odernheim am Glan' },
      ]);
    });

    it('excludes the Unknown placeholder from prefix results', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=DE&prefix=10');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ postalCode: string; city: string }>;
      expect(body).toEqual([{ postalCode: '10115', city: 'Berlin' }]);
    });

    it('returns an empty list for a non-DACH country', async () => {
      const response = await get('/api/address-lookup/postal-codes?country=US&prefix=90');

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ postalCode: string; city: string }>;
      expect(body).toEqual([]);
    });
  });
});
