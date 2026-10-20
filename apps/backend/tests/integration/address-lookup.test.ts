import { parseWith } from '@datenknoten/kit/schema';
import {
  CityInfoResponseSchema,
  ErrorResponseSchema,
  PostalCodeInfoResponseSchema,
} from '@freundebuch/shared/index.js';
import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import {
  completeTestUserOnboarding,
  createBetterAuthSession,
  createTestUser,
  setupAuthTestSuite,
} from './auth.helpers.js';

describe('Address lookup API (/api/address-lookup)', { timeout: 30000 }, () => {
  const { getContext } = setupAuthTestSuite();

  async function createUserAndLogin(email: string) {
    const { pool } = getContext();
    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const user = await createTestUser(pool, email, passwordHash);
    // The onboarding middleware blocks users who have not finished it.
    await completeTestUserOnboarding(pool, user.externalId);
    return createBetterAuthSession(pool, user.externalId);
  }

  async function get(path: string, sessionCookies?: string) {
    const headers: Record<string, string> = {};
    if (sessionCookies !== undefined) {
      headers.Cookie = sessionCookies;
    }
    return getContext().app.fetch(new Request(`http://localhost${path}`, { headers }));
  }

  async function expectInvalidQuery(email: string, path: string) {
    const response = await get(path, await createUserAndLogin(email));

    expect(response.status).toBe(400);
    const body = parseWith(ErrorResponseSchema, await response.json());
    expect(body.error).toBe('Invalid query parameters');
  }

  describe('without a session', () => {
    it('returns 401 for /cities', async () => {
      const response = await get('/api/address-lookup/cities?country=DE&postal_code=12345');
      expect(response.status).toBe(401);
    });

    it('returns 401 for /streets', async () => {
      const response = await get(
        '/api/address-lookup/streets?country=DE&city=Berlin&postal_code=12345',
      );
      expect(response.status).toBe(401);
    });

    it('returns 401 for /house-numbers', async () => {
      const response = await get(
        '/api/address-lookup/house-numbers?country=DE&city=Berlin&postal_code=12345&street=Hauptstr.',
      );
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/address-lookup/cities', () => {
    describe('with invalid query parameters', () => {
      it('returns 400 when country is missing', async () => {
        await expectInvalidQuery(
          'addr-cities1@test.com',
          '/api/address-lookup/cities?postal_code=12345',
        );
      });

      it('returns 400 when postal_code is missing', async () => {
        await expectInvalidQuery('addr-cities2@test.com', '/api/address-lookup/cities?country=DE');
      });

      it('returns 400 when postal_code is empty', async () => {
        await expectInvalidQuery(
          'addr-cities3@test.com',
          '/api/address-lookup/cities?country=DE&postal_code=',
        );
      });
    });

    describe('without PostGIS data', () => {
      it('returns an empty list because PostGIS is disabled in the test env', async () => {
        // Address lookup is PostGIS-only; with PostGIS disabled (default in the
        // test env) there is no upstream fallback, so cities resolve to an empty
        // list and the frontend falls back to free-text entry.
        const response = await get(
          '/api/address-lookup/cities?country=DE&postal_code=12345',
          await createUserAndLogin('addr-nopg@test.com'),
        );

        expect(response.status).toBe(200);
        expect(parseWith(CityInfoResponseSchema.array(), await response.json())).toEqual([]);
      });
    });
  });

  describe('GET /api/address-lookup/streets', () => {
    describe('with invalid query parameters', () => {
      it('returns 400 when country is missing', async () => {
        await expectInvalidQuery(
          'addr-streets1@test.com',
          '/api/address-lookup/streets?city=Berlin&postal_code=12345',
        );
      });

      it('returns 400 when city is missing', async () => {
        await expectInvalidQuery(
          'addr-streets2@test.com',
          '/api/address-lookup/streets?country=DE&postal_code=12345',
        );
      });

      it('returns 400 when postal_code is missing', async () => {
        await expectInvalidQuery(
          'addr-streets3@test.com',
          '/api/address-lookup/streets?country=DE&city=Berlin',
        );
      });
    });
  });

  describe('GET /api/address-lookup/house-numbers', () => {
    describe('with invalid query parameters', () => {
      it('returns 400 when country is missing', async () => {
        await expectInvalidQuery(
          'addr-hn1@test.com',
          '/api/address-lookup/house-numbers?city=Berlin&postal_code=12345&street=Hauptstr.',
        );
      });

      it('returns 400 when street is missing', async () => {
        await expectInvalidQuery(
          'addr-hn2@test.com',
          '/api/address-lookup/house-numbers?country=DE&city=Berlin&postal_code=12345',
        );
      });

      it('returns 400 when all parameters are missing', async () => {
        await expectInvalidQuery('addr-hn3@test.com', '/api/address-lookup/house-numbers');
      });
    });
  });

  describe('GET /api/address-lookup/postal-codes', () => {
    it('returns 400 when the prefix is too short', async () => {
      await expectInvalidQuery(
        'addr-pc1@test.com',
        '/api/address-lookup/postal-codes?country=DE&prefix=5',
      );
    });

    it('returns an empty list because PostGIS is disabled in the test env', async () => {
      const response = await get(
        '/api/address-lookup/postal-codes?country=DE&prefix=55',
        await createUserAndLogin('addr-pc2@test.com'),
      );

      expect(response.status).toBe(200);
      expect(parseWith(PostalCodeInfoResponseSchema.array(), await response.json())).toEqual([]);
    });
  });
});
