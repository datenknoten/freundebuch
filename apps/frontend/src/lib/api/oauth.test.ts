import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { OAuthApi } from './oauth.js';

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
  return new OAuthApi({ client: createClient() });
}

describe('OAuthApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getClient', () => {
    it('returns the registered client', async () => {
      const client = { clientId: 'abc', name: 'Claude', icon: null };
      fetchMock.mockResolvedValueOnce(jsonResponse(client));

      await expect(createApi().getClient('abc')).resolves.toEqual(client);
    });
  });

  describe('submitConsent', () => {
    it('sends the decision with the snake_case consent code', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ redirectURI: 'https://client.example/cb' }));

      const consent = await createApi().submitConsent('code-1', true);

      expect(consent.redirectURI).toBe('https://client.example/cb');
      expect(JSON.parse(String(sentRequest()[1]?.body))).toEqual({
        accept: true,
        consent_code: 'code-1',
      });
    });

    it('throws ValidationError when the redirect is no URL', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ redirectURI: 'not a url' }));

      await expect(createApi().submitConsent('code-1', false)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
