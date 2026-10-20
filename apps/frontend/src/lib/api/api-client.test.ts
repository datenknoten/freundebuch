import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { type } from 'arktype';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { ApiError } from './api-error.js';

const ItemSchema = type({ id: 'string' });

const fetchMock = vi.fn<typeof fetch>();
const onUnauthorized = vi.fn<() => Promise<boolean>>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createClient() {
  return new ApiClient({
    baseUrl: 'https://api.example.test',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized,
  });
}

function sentInit(callIndex = 0) {
  return itemAt(fetchMock.mock.calls, callIndex)[1] ?? {};
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    onUnauthorized.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('request', () => {
    it('returns the body parsed by the schema', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'c-1' }));

      await expect(createClient().request(ItemSchema, '/api/items/c-1')).resolves.toEqual({
        id: 'c-1',
      });
    });

    it('throws ValidationError when the body does not match the schema', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42 }));

      await expect(createClient().request(ItemSchema, '/api/items/c-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('parses a 204 as undefined, which a type("undefined") schema accepts', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      await expect(
        createClient().request(type('undefined'), '/api/items/c-1', { method: 'DELETE' }),
      ).resolves.toBeUndefined();
    });

    it('sends the session cookie and a JSON content type to the base URL', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'c-1' }));

      await createClient().request(ItemSchema, '/api/items', { method: 'POST', body: '{}' });

      expect(itemAt(fetchMock.mock.calls, 0)[0]).toBe('https://api.example.test/api/items');
      expect(sentInit().credentials).toBe('include');
      expect(new Headers(sentInit().headers).get('Content-Type')).toBe('application/json');
    });

    it('leaves the content type of a FormData body to the browser', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'c-1' }));

      await createClient().request(ItemSchema, '/api/uploads', {
        method: 'POST',
        body: new FormData(),
      });

      expect(new Headers(sentInit().headers).has('Content-Type')).toBe(false);
    });
  });

  describe('a non-2xx answer', () => {
    it('throws ApiError with the status and the error body of the backend', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: 'Circle not found', code: 'NOT_FOUND' }, 404),
      );

      const error = await createClient()
        .request(ItemSchema, '/api/items/c-1')
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        statusCode: 404,
        message: 'Circle not found',
        code: 'NOT_FOUND',
      });
    });

    it('throws ApiError with a generic message when the body is no error response', async () => {
      fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));

      await expect(createClient().request(ItemSchema, '/api/items')).rejects.toMatchObject({
        statusCode: 502,
        message: 'An unknown error occurred',
      });
    });

    it('rejects with the TypeError of fetch when the network fails', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(createClient().request(ItemSchema, '/api/items')).rejects.toBeInstanceOf(
        TypeError,
      );
    });
  });

  describe('a 401', () => {
    it('replays the request once the user signed in again', async () => {
      onUnauthorized.mockResolvedValueOnce(true);
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ id: 'c-1' }));

      await expect(createClient().request(ItemSchema, '/api/items/c-1')).resolves.toEqual({
        id: 'c-1',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rejects with the 401 when the user does not sign in again', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));

      await expect(createClient().request(ItemSchema, '/api/items')).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks only once when the replay is rejected as well', async () => {
      onUnauthorized.mockResolvedValue(true);
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));

      await expect(createClient().request(ItemSchema, '/api/items')).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });
});
