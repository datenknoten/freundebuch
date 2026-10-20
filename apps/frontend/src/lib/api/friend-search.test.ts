import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { itemAt } from '$lib/test/item-at.js';
import { FriendSearchApi } from './friend-search.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function sentRequest() {
  const [url, init] = itemAt(fetchMock.mock.calls, 0);
  return { url: String(url), body: init?.body };
}

function createFriendSearchApi() {
  return new FriendSearchApi({ client: createTestApiClient() });
}

describe('FriendSearchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('searchFriends', () => {
    it('returns the matching friends', async () => {
      const hit = { id: 'f-1', displayName: 'Ada' };
      fetchMock.mockResolvedValueOnce(jsonResponse([hit]));

      await expect(createFriendSearchApi().searchFriends({ query: 'Ada' })).resolves.toEqual([hit]);
    });

    it('sends the excluded friend and the limit as query params', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));

      await createFriendSearchApi().searchFriends({
        query: 'Ada',
        excludeFriendId: 'f-9',
        limit: 5,
      });

      expect(sentRequest().url).toBe('/api/friends/search?q=Ada&exclude=f-9&limit=5');
    });

    it('throws ValidationError when a hit lacks its display name', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'f-1' }]));

      await expect(createFriendSearchApi().searchFriends({ query: 'Ada' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('facetedSearch', () => {
    it('joins each filter into one comma-separated query param', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      await createFriendSearchApi()
        .facetedSearch({
          query: 'Ada',
          filters: { city: ['Berlin', 'Munich'], country: [] },
          shouldIncludeFacets: true,
        })
        .catch(() => undefined);

      expect(sentRequest().url).toBe(
        '/api/friends/search/faceted?q=Ada&include_facets=true&city=Berlin%2CMunich',
      );
    });

    it('throws ValidationError when the response lacks its results', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ facets: null }));

      await expect(createFriendSearchApi().facetedSearch({ query: 'Ada' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('listRecentSearches', () => {
    it('returns the recent queries', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(['Ada', 'Bob']));

      await expect(createFriendSearchApi().listRecentSearches(10)).resolves.toEqual(['Ada', 'Bob']);
    });

    it('throws ValidationError when an entry is not a string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([1]));

      await expect(createFriendSearchApi().listRecentSearches()).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('deleteRecentSearch', () => {
    it('encodes the query into the path', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

      await createFriendSearchApi().deleteRecentSearch('a/b');

      expect(sentRequest().url).toBe('/api/friends/search/recent/a%2Fb');
    });
  });
});
