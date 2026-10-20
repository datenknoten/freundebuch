import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { AddressLookupApi } from './address-lookup.js';
import { ApiClient } from './api-client.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createClient() {
  return new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
}

function sentRequest() {
  return itemAt(fetchMock.mock.calls, 0);
}

function createApi() {
  return new AddressLookupApi({ client: createClient() });
}

function sentQuery() {
  return Object.fromEntries(new URL(String(sentRequest()[0]), 'http://localhost').searchParams);
}

describe('AddressLookupApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listPostalCodes', () => {
    it('returns the postal-code suggestions', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ postalCode: '10115', city: 'Berlin' }]));

      await expect(createApi().listPostalCodes('DE', '101')).resolves.toEqual([
        { postalCode: '10115', city: 'Berlin' },
      ]);
    });

    it('throws ValidationError when a suggestion lacks its city', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ postalCode: '10115' }]));

      await expect(createApi().listPostalCodes('DE', '101')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('listStreets', () => {
    it('sends the lookup as the snake_case query', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ name: 'Unter den Linden' }]));

      await createApi().listStreets({ countryCode: 'DE', city: 'Berlin', postalCode: '10117' });

      expect(sentQuery()).toEqual({ country: 'DE', city: 'Berlin', postal_code: '10117' });
    });
  });

  describe('listHouseNumbers', () => {
    it('returns the house numbers of the street', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ number: '1' }, { number: '2a' }]));

      const houseNumbers = await createApi().listHouseNumbers({
        countryCode: 'DE',
        city: 'Berlin',
        postalCode: '10117',
        street: 'Unter den Linden',
      });

      expect(houseNumbers).toEqual([{ number: '1' }, { number: '2a' }]);
      expect(sentQuery()).toMatchObject({ street: 'Unter den Linden', postal_code: '10117' });
    });
  });
});
