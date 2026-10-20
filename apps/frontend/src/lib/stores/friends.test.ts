import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { aFriend, aFriendListItem, aPhone } from '$lib/test/fixtures.js';
import { ApiError } from '../api/api-error.js';
import { CirclesApi } from '../api/circles.js';
import { FriendDetailsApi } from '../api/friend-details.js';
import { FriendPhotosApi } from '../api/friend-photos.js';
import { FriendSearchApi } from '../api/friend-search.js';
import { FriendsApi } from '../api/friends.js';
import { FriendsStore } from './friends.js';

const client = createTestApiClient();
const friendsApi = new FriendsApi({ client });
const friendDetailsApi = new FriendDetailsApi({ client });
const friendPhotosApi = new FriendPhotosApi({ client });
const friendSearchApi = new FriendSearchApi({ client });
const circlesApi = new CirclesApi({ client });

function createFriendsStore() {
  return new FriendsStore({
    friendsApi,
    friendDetailsApi,
    friendPhotosApi,
    friendSearchApi,
    circlesApi,
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
  });
}

async function storeWithFriend(friend = aFriend({ id: 'f-1' })) {
  const store = createFriendsStore();
  vi.spyOn(friendsApi, 'getFriend').mockResolvedValueOnce(friend);
  await store.loadFriend(friend.id);
  return store;
}

describe('FriendsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadFriends', () => {
    it('keeps the page of friends and its pagination', async () => {
      const item = aFriendListItem({ id: 'f-1' });
      vi.spyOn(friendsApi, 'listFriends').mockResolvedValueOnce({
        data: [item],
        pagination: { page: 2, pageSize: 10, totalCount: 11, totalPages: 2 },
      });
      const store = createFriendsStore();

      await store.loadFriends({ page: 2 });

      expect(get(store.list)).toEqual([item]);
      expect(get(store)).toMatchObject({ page: 2, pageSize: 10, total: 11, totalPages: 2 });
    });

    it('stores the API message and rethrows when the request fails', async () => {
      vi.spyOn(friendsApi, 'listFriends').mockRejectedValueOnce(new ApiError(500, 'Boom'));
      const store = createFriendsStore();

      await expect(store.loadFriends()).rejects.toBeInstanceOf(ApiError);
      expect(get(store).error).toBe('Boom');
      expect(get(store.isLoading)).toBe(false);
    });
  });

  describe('loadFriend', () => {
    it('clears the friend on display when the friend cannot be loaded', async () => {
      const store = await storeWithFriend();
      vi.spyOn(friendsApi, 'getFriend').mockRejectedValueOnce(new ApiError(404, 'Not found'));

      await expect(store.loadFriend('f-2')).rejects.toBeInstanceOf(ApiError);

      expect(get(store.currentFriend)).toBeNull();
    });
  });

  describe('deleteFriend', () => {
    it('drops the friend from the list and from display', async () => {
      const store = await storeWithFriend();
      vi.spyOn(friendsApi, 'deleteFriend').mockResolvedValueOnce(undefined);

      await store.deleteFriend('f-1');

      expect(get(store.currentFriend)).toBeNull();
    });
  });

  describe('loadRelationshipTypes', () => {
    it('requests the types once and serves the cache afterwards', async () => {
      const types = { family: [], professional: [], social: [] };
      const listTypes = vi.spyOn(friendsApi, 'listRelationshipTypes').mockResolvedValue(types);
      const store = createFriendsStore();

      await store.loadRelationshipTypes();
      await expect(store.loadRelationshipTypes()).resolves.toBe(types);

      expect(listTypes).toHaveBeenCalledTimes(1);
    });
  });

  describe('sub-resources of the friend on display', () => {
    it('appends an added phone', async () => {
      const store = await storeWithFriend();
      const phone = aPhone({ id: 'p-1' });
      vi.spyOn(friendDetailsApi, 'addPhone').mockResolvedValueOnce(phone);

      await store.addPhone('f-1', { phoneNumber: phone.phoneNumber, phoneType: 'mobile' });

      expect(get(store.currentFriend)?.phones).toEqual([phone]);
    });

    it('replaces an updated phone in place', async () => {
      const store = await storeWithFriend(aFriend({ id: 'f-1', phones: [aPhone({ id: 'p-1' })] }));
      const updated = aPhone({ id: 'p-1', label: 'Office' });
      vi.spyOn(friendDetailsApi, 'updatePhone').mockResolvedValueOnce(updated);

      await store.updatePhone('f-1', 'p-1', {
        phoneNumber: updated.phoneNumber,
        phoneType: 'work',
      });

      expect(get(store.currentFriend)?.phones).toEqual([updated]);
    });

    it('removes a deleted phone', async () => {
      const store = await storeWithFriend(aFriend({ id: 'f-1', phones: [aPhone({ id: 'p-1' })] }));
      vi.spyOn(friendDetailsApi, 'deletePhone').mockResolvedValueOnce(undefined);

      await store.deletePhone('f-1', 'p-1');

      expect(get(store.currentFriend)?.phones).toEqual([]);
    });

    it('takes the photo URLs of an upload', async () => {
      const store = await storeWithFriend();
      vi.spyOn(friendPhotosApi, 'uploadPhoto').mockResolvedValueOnce({
        photoUrl: '/p.jpg',
        photoThumbnailUrl: '/t.jpg',
      });

      await store.uploadPhoto('f-1', new File(['x'], 'p.jpg'));

      expect(get(store.currentFriend)).toMatchObject({
        photoUrl: '/p.jpg',
        photoThumbnailUrl: '/t.jpg',
      });
    });

    it('adds the friend to a circle through the circles API', async () => {
      const store = await storeWithFriend();
      const circle = { id: 'c-1', name: 'Family', color: null };
      vi.spyOn(circlesApi, 'addFriendToCircle').mockResolvedValueOnce(circle);

      await store.addCircle('f-1', 'c-1');

      expect(get(store.currentFriend)?.circles).toEqual([circle]);
    });

    it('leaves the state untouched when no friend is on display', async () => {
      const store = createFriendsStore();
      vi.spyOn(friendDetailsApi, 'addPhone').mockResolvedValueOnce(aPhone());

      await store.addPhone('f-1', { phoneNumber: '+49 30 1234567', phoneType: 'mobile' });

      expect(get(store.currentFriend)).toBeNull();
    });
  });

  describe('refreshFriend', () => {
    it('swallows a failed refetch', async () => {
      const store = createFriendsStore();
      vi.spyOn(friendsApi, 'getFriend').mockRejectedValueOnce(new ApiError(500, 'Boom'));

      await expect(store.refreshFriend('f-1')).resolves.toBeUndefined();
    });
  });
});
