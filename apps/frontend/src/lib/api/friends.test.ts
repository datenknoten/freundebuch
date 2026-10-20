import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { aFriend, aFriendListItem } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { FriendsApi } from './friends.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function sentRequest() {
  const [url, init] = itemAt(fetchMock.mock.calls, 0);
  return { url: String(url), body: init?.body };
}

function sentJson() {
  return JSON.parse(String(sentRequest().body));
}

function createFriendsApi() {
  return new FriendsApi({ client: createTestApiClient() });
}

describe('FriendsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listFriends', () => {
    it('returns the page of friends', async () => {
      const page = {
        data: [aFriendListItem({ id: 'f-1' })],
        pagination: { page: 2, pageSize: 10, totalCount: 11, totalPages: 2 },
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(page));

      await expect(createFriendsApi().listFriends()).resolves.toEqual(page);
    });

    it('sends paging and sorting as snake_case query params', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [],
          pagination: { page: 2, pageSize: 10, totalCount: 0, totalPages: 0 },
        }),
      );

      await createFriendsApi().listFriends({
        page: 2,
        pageSize: 10,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      expect(sentRequest().url).toBe(
        '/api/friends?page=2&page_size=10&sort_by=created_at&sort_order=desc',
      );
    });

    it('throws ValidationError when the page lacks its pagination', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

      await expect(createFriendsApi().listFriends()).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('createFriend', () => {
    it('sends the friend and its met info as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aFriend(), 201));

      await createFriendsApi().createFriend({
        displayName: 'Ada Lovelace',
        nameFirst: 'Ada',
        metInfo: { metLocation: 'London' },
      });

      expect(sentJson()).toEqual({
        display_name: 'Ada Lovelace',
        name_first: 'Ada',
        met_info: { met_location: 'London' },
      });
    });

    it('throws ValidationError when the created friend lacks an id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ displayName: 'Ada' }, 201));

      await expect(createFriendsApi().createFriend({ displayName: 'Ada' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('updateFriend', () => {
    it('sends null to clear a field', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aFriend()));

      await createFriendsApi().updateFriend('f-1', { displayName: 'Ada', nickname: null });

      expect(sentJson()).toEqual({ display_name: 'Ada', nickname: null });
    });
  });

  describe('deleteFriend', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Friend deleted successfully' }));

      await expect(createFriendsApi().deleteFriend('f-1')).resolves.toBeUndefined();
    });

    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: true }));

      await expect(createFriendsApi().deleteFriend('f-1')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('getDashboard', () => {
    it('throws ValidationError when the network graph is missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ upcomingDates: [] }));

      await expect(createFriendsApi().getDashboard({ days: 30 })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
