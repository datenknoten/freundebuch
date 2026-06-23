import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mocks must live in vi.hoisted() because vi.mock factories are hoisted
// above module scope.
const h = vi.hoisted(() => {
  class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
    }
  }
  return {
    ApiError,
    api: {
      listFriends: vi.fn(),
      getFriend: vi.fn(),
      createFriend: vi.fn(),
      updateFriend: vi.fn(),
      deleteFriend: vi.fn(),
      getRelationshipTypes: vi.fn(),
      searchFriends: vi.fn(),
    },
    subresourceOps: vi.fn(() => ({})),
  };
});

vi.mock('$shared', () => ({}));
vi.mock('../api/friends.js', () => h.api);
vi.mock('../api/auth.js', () => ({ ApiError: h.ApiError }));
vi.mock('./friend-subresources.js', () => ({ createSubresourceOps: h.subresourceOps }));

import { currentFriend, friendList, friends, isFriendsLoading } from './friends.js';

const page = (friendsList: Array<{ id: string }>, total = friendsList.length) => ({
  friends: friendsList,
  total,
  page: 1,
  pageSize: 25,
  totalPages: 1,
});

describe('friends store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    friends.reset();
  });

  afterEach(() => {
    friends.reset();
  });

  describe('loadFriends', () => {
    it('maps the paginated response into state and clears loading', async () => {
      h.api.listFriends.mockResolvedValue(page([{ id: 'f-1' }, { id: 'f-2' }], 2));

      await friends.loadFriends();

      const state = get(friends);
      expect(state.friends).toHaveLength(2);
      expect(state.total).toBe(2);
      expect(state.isLoading).toBe(false);
      expect(get(friendList)).toHaveLength(2);
      expect(get(isFriendsLoading)).toBe(false);
    });

    it('records an error message on failure', async () => {
      h.api.listFriends.mockRejectedValue(new h.ApiError(500, 'boom'));

      await expect(friends.loadFriends()).rejects.toThrow();
      expect(get(friends).error).toBe('boom');
    });
  });

  describe('loadFriend', () => {
    it('sets the current friend on success', async () => {
      h.api.getFriend.mockResolvedValue({ id: 'f-1', displayName: 'Ada' });

      await friends.loadFriend('f-1');

      expect(get(currentFriend)).toMatchObject({ id: 'f-1' });
    });

    it('clears the current friend on failure (onError)', async () => {
      h.api.getFriend.mockRejectedValue(new h.ApiError(404, 'nope'));

      await expect(friends.loadFriend('f-1')).rejects.toThrow();
      expect(get(currentFriend)).toBeNull();
    });
  });

  describe('deleteFriend', () => {
    it('removes the friend from the list, decrements total, and clears current', async () => {
      h.api.listFriends.mockResolvedValue(page([{ id: 'f-1' }, { id: 'f-2' }], 2));
      await friends.loadFriends();
      h.api.getFriend.mockResolvedValue({ id: 'f-1' });
      await friends.loadFriend('f-1');

      h.api.deleteFriend.mockResolvedValue(undefined);
      await friends.deleteFriend('f-1');

      const state = get(friends);
      expect(state.friends.map((f) => f.id)).toEqual(['f-2']);
      expect(state.total).toBe(1);
      expect(state.currentFriend).toBeNull();
    });
  });

  describe('loadRelationshipTypes', () => {
    it('fetches once and serves subsequent calls from cache', async () => {
      const types = { family: [], professional: [], social: [] };
      h.api.getRelationshipTypes.mockResolvedValue(types);

      const first = await friends.loadRelationshipTypes();
      const second = await friends.loadRelationshipTypes();

      expect(first).toBe(types);
      expect(second).toBe(types);
      expect(h.api.getRelationshipTypes).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchFriends', () => {
    it('returns API results', async () => {
      h.api.searchFriends.mockResolvedValue([{ id: 'f-1' }]);

      const result = await friends.searchFriends('ada', undefined, 5);

      expect(result).toEqual([{ id: 'f-1' }]);
      expect(h.api.searchFriends).toHaveBeenCalledWith('ada', undefined, 5);
    });

    it('records an error and rethrows on failure', async () => {
      h.api.searchFriends.mockRejectedValue(new h.ApiError(500, 'search failed'));

      await expect(friends.searchFriends('x')).rejects.toThrow();
      expect(get(friends).error).toBe('search failed');
    });
  });

  describe('utility methods', () => {
    it('clearCurrentFriend and clearError reset their fields', async () => {
      h.api.getFriend.mockResolvedValue({ id: 'f-1' });
      await friends.loadFriend('f-1');
      friends.clearCurrentFriend();
      expect(get(currentFriend)).toBeNull();

      h.api.listFriends.mockRejectedValue(new h.ApiError(500, 'boom'));
      await expect(friends.loadFriends()).rejects.toThrow();
      friends.clearError();
      expect(get(friends).error).toBeNull();
    });

    it('reset returns to the initial state', async () => {
      h.api.getFriend.mockResolvedValue({ id: 'f-1' });
      await friends.loadFriend('f-1');

      friends.reset();

      expect(get(friends).currentFriend).toBeNull();
      expect(get(friends).page).toBe(1);
    });
  });
});
