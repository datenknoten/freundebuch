import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    friendsApi: {
      addPhone: vi.fn(),
      updatePhone: vi.fn(),
      deletePhone: vi.fn(),
      setMetInfo: vi.fn(),
      deleteMetInfo: vi.fn(),
      addRelationship: vi.fn(),
    },
    circlesApi: {
      addFriendToCircle: vi.fn(),
      removeFriendFromCircle: vi.fn(),
    },
  };
});

vi.mock('$shared', () => ({}));
vi.mock('../api/friends.js', () => h.friendsApi);
vi.mock('../api/circles.js', () => h.circlesApi);
vi.mock('../api/auth.js', () => ({ ApiError: h.ApiError }));

import { aFriend, aPhone, createUpdateRecorder } from '$lib/test';
import { createSubresourceOps } from './friend-subresources.js';
import type { FriendsState } from './friends.js';

function setup(friend = aFriend()) {
  const initial: FriendsState = {
    friends: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 0,
    currentFriend: friend,
    relationshipTypes: null,
    isLoading: false,
    error: null,
  };
  const rec = createUpdateRecorder<FriendsState>(initial);
  const ops = createSubresourceOps(rec.update);
  return { rec, ops };
}

describe('createSubresourceOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('phones (array add/update/delete)', () => {
    it('addPhone appends to currentFriend.phones', async () => {
      const { rec, ops } = setup();
      const phone = aPhone({ id: 'ph-1' });
      h.friendsApi.addPhone.mockResolvedValue(phone);

      await ops.addPhone('f-1', { phone_number: '123', phone_type: 'mobile' } as never);

      expect(rec.last.currentFriend?.phones).toEqual([phone]);
    });

    it('updatePhone replaces the matching phone', async () => {
      const existing = aPhone({ id: 'ph-1', phoneNumber: 'old' });
      const { rec, ops } = setup(aFriend({ phones: [existing] }));
      const updated = aPhone({ id: 'ph-1', phoneNumber: 'new' });
      h.friendsApi.updatePhone.mockResolvedValue(updated);

      await ops.updatePhone('f-1', 'ph-1', { phone_number: 'new' });

      expect(rec.last.currentFriend?.phones).toEqual([updated]);
    });

    it('deletePhone removes the phone', async () => {
      const { rec, ops } = setup(aFriend({ phones: [aPhone({ id: 'ph-1' })] }));
      h.friendsApi.deletePhone.mockResolvedValue(undefined);

      await ops.deletePhone('f-1', 'ph-1');

      expect(rec.last.currentFriend?.phones).toEqual([]);
    });
  });

  describe('metInfo (single object)', () => {
    it('setMetInfo sets currentFriend.metInfo', async () => {
      const { rec, ops } = setup();
      const metInfo = { id: 'm-1', createdAt: 't', updatedAt: 't' };
      h.friendsApi.setMetInfo.mockResolvedValue(metInfo);

      await ops.setMetInfo('f-1', { met_location: 'Berlin' } as never);

      expect(rec.last.currentFriend?.metInfo).toEqual(metInfo);
    });

    it('deleteMetInfo clears currentFriend.metInfo', async () => {
      const { rec, ops } = setup(
        aFriend({ metInfo: { id: 'm-1', createdAt: 't', updatedAt: 't' } }),
      );
      h.friendsApi.deleteMetInfo.mockResolvedValue(undefined);

      await ops.deleteMetInfo('f-1');

      expect(rec.last.currentFriend?.metInfo).toBeUndefined();
    });
  });

  describe('relationships (array with nullish fallback)', () => {
    it('addRelationship appends even when relationships is initially undefined', async () => {
      const { rec, ops } = setup(aFriend({ relationships: undefined }));
      const relationship = { id: 'r-1', relatedFriendId: 'f-2' };
      h.friendsApi.addRelationship.mockResolvedValue(relationship);

      await ops.addRelationship('f-1', { related_friend_id: 'f-2' } as never);

      expect(rec.last.currentFriend?.relationships).toEqual([relationship]);
    });
  });

  describe('circles (via circlesApi)', () => {
    it('addCircle appends the returned circle summary', async () => {
      const { rec, ops } = setup();
      const circle = { id: 'c-1', name: 'Close' };
      h.circlesApi.addFriendToCircle.mockResolvedValue(circle);

      await ops.addCircle('f-1', 'c-1');

      expect(h.circlesApi.addFriendToCircle).toHaveBeenCalledWith('f-1', 'c-1');
      expect(rec.last.currentFriend?.circles).toEqual([circle]);
    });

    it('removeCircle filters out the circle', async () => {
      const { rec, ops } = setup(aFriend({ circles: [{ id: 'c-1', name: 'Close' } as never] }));
      h.circlesApi.removeFriendFromCircle.mockResolvedValue(undefined);

      await ops.removeCircle('f-1', 'c-1');

      expect(rec.last.currentFriend?.circles).toEqual([]);
    });
  });
});
