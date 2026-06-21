import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_COUNTRIES } from '../../src/utils/countries.js';
import {
  completeTestUserOnboarding,
  createBetterAuthSession,
  createTestUser,
  setupAuthTestSuite,
} from './auth.helpers.js';

describe('Address Lookup API - Integration Tests', { timeout: 30000 }, () => {
  const { getContext } = setupAuthTestSuite();

  /**
   * Helper to create a test user and get session cookies
   */
  async function createUserAndLogin(email: string, password: string) {
    const { pool } = getContext();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createTestUser(pool, email, passwordHash);
    // Complete onboarding (required by onboarding middleware)
    await completeTestUserOnboarding(pool, user.externalId);
    const sessionCookies = await createBetterAuthSession(pool, user.externalId);
    return { user, sessionCookies };
  }

  describe('Authentication', () => {
    it('should return 401 for unauthenticated request to /countries', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/countries', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated request to /cities', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/cities?country=DE&postal_code=12345', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated request to /streets', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request(
          'http://localhost/api/address-lookup/streets?country=DE&city=Berlin&postal_code=12345',
          {
            method: 'GET',
          },
        ),
      );

      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated request to /house-numbers', async () => {
      const { app } = getContext();

      const response = await app.fetch(
        new Request(
          'http://localhost/api/address-lookup/house-numbers?country=DE&city=Berlin&postal_code=12345&street=Hauptstr.',
          {
            method: 'GET',
          },
        ),
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/address-lookup/countries', () => {
    it('should return list of supported countries when authenticated', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-countries@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/countries', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ code: string; name: string }>;

      // Should return an array
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      // Should match the exported SUPPORTED_COUNTRIES
      expect(body).toEqual(SUPPORTED_COUNTRIES);

      // Each country should have code and name
      for (const country of body) {
        expect(country).toHaveProperty('code');
        expect(country).toHaveProperty('name');
        expect(country.code.length).toBe(2); // ISO 3166-1 alpha-2
      }
    });

    it('should include common countries like Germany and United States', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-countries2@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/countries', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ code: string; name: string }>;

      const germany = body.find((c) => c.code === 'DE');
      expect(germany).toBeDefined();
      expect(germany?.name).toBe('Germany');

      const usa = body.find((c) => c.code === 'US');
      expect(usa).toBeDefined();
      expect(usa?.name).toBe('United States');
    });
  });

  describe('GET /api/address-lookup/cities - Validation', () => {
    it('should return 400 when country is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-cities1@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/cities?postal_code=12345', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when postal_code is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-cities2@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/cities?country=DE', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when postal_code is empty', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-cities3@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/cities?country=DE&postal_code=', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/address-lookup/streets - Validation', () => {
    it('should return 400 when country is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-streets1@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/streets?city=Berlin&postal_code=12345', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when city is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-streets2@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/streets?country=DE&postal_code=12345', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when postal_code is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin(
        'addr-streets3@test.com',
        'TestPassword123',
      );

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/streets?country=DE&city=Berlin', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });
  });

  describe('GET /api/address-lookup/house-numbers - Validation', () => {
    it('should return 400 when country is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-hn1@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request(
          'http://localhost/api/address-lookup/house-numbers?city=Berlin&postal_code=12345&street=Hauptstr.',
          {
            method: 'GET',
            headers: {
              Cookie: sessionCookies,
            },
          },
        ),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when street is missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-hn2@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request(
          'http://localhost/api/address-lookup/house-numbers?country=DE&city=Berlin&postal_code=12345',
          {
            method: 'GET',
            headers: {
              Cookie: sessionCookies,
            },
          },
        ),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return 400 when all parameters are missing', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-hn3@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/house-numbers', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });
  });

  describe('Cities lookup without PostGIS data', () => {
    it('should return an empty list (200) when PostGIS is disabled in the test env', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-nopg@test.com', 'TestPassword123');

      // Address lookup is PostGIS-only; with PostGIS disabled (default in the
      // test env) there is no upstream fallback, so cities resolve to an empty
      // list and the frontend falls back to free-text entry.
      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/cities?country=DE&postal_code=12345', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ city: string }>;
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/address-lookup/postal-codes - Validation', () => {
    it('should return 400 when prefix is too short', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-pc1@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/postal-codes?country=DE&prefix=5', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('Invalid query parameters');
    });

    it('should return an empty list (200) when PostGIS is disabled in the test env', async () => {
      const { app } = getContext();
      const { sessionCookies } = await createUserAndLogin('addr-pc2@test.com', 'TestPassword123');

      const response = await app.fetch(
        new Request('http://localhost/api/address-lookup/postal-codes?country=DE&prefix=55', {
          method: 'GET',
          headers: {
            Cookie: sessionCookies,
          },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{ postalCode: string; city: string }>;
      expect(body).toEqual([]);
    });
  });
});
