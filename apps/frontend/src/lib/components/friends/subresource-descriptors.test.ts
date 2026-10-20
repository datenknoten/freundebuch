import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import type { SocialProfileResponse } from '$shared';
import {
  createCollectiveDescriptor,
  createFriendAddDetailOptions,
  createFriendDescriptors,
  hasProfileUrl,
} from './subresource-descriptors';

// i18n stubbed as an echo so the mapped keys are observable.
function t(key: string) {
  return key;
}

function aSocialProfile(overrides: Partial<SocialProfileResponse> = {}): SocialProfileResponse {
  return {
    id: 'social-1',
    platform: 'github',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function setUp() {
  const context = createTestAppContext();
  const refreshFriend = vi
    .spyOn(context.stores.friends, 'refreshFriend')
    .mockResolvedValue(undefined);
  const descriptors = createFriendDescriptors({
    friendsStore: context.stores.friends,
    friendNotesApi: context.api.friendNotes,
  });
  const collectiveDescriptor = createCollectiveDescriptor({
    collectiveMembersApi: context.api.collectiveMembers,
    onChanged: vi.fn(),
  });
  return { descriptors, collectiveDescriptor, refreshFriend };
}

describe('createFriendDescriptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('address', () => {
    it('refetches the friend a few times after a save so geocoding lands', () => {
      const { descriptors, refreshFriend } = setUp();

      descriptors.address.afterSave?.(async () => undefined, 'f1');
      expect(refreshFriend).not.toHaveBeenCalled();
      vi.runAllTimers();

      expect(refreshFriend.mock.calls).toEqual([['f1'], ['f1'], ['f1']]);
    });

    it('stops the remaining refetches when cancelled', () => {
      const { descriptors, refreshFriend } = setUp();

      const cancel = descriptors.address.afterSave?.(async () => undefined, 'f1');
      vi.advanceTimersByTime(800);
      cancel?.();
      vi.runAllTimers();

      expect(refreshFriend).toHaveBeenCalledTimes(1);
    });
  });

  describe('phone', () => {
    it('maps validation failures to the field hints', () => {
      const { descriptors } = setUp();
      const { mapError } = descriptors.phone;

      expect(
        mapError?.(new ApiError(400, 'Invalid phone number', { code: 'VALIDATION_ERROR' }), t),
      ).toBe('subresources.phone.invalidNumber');
      expect(mapError?.(new ApiError(422, 'nope', { code: 'PHONE_COUNTRY_UNKNOWN' }), t)).toBe(
        'subresources.phone.unknownCountry',
      );
      expect(mapError?.(new ApiError(500, 'boom'), t)).toBeUndefined();
      expect(mapError?.(new Error('offline'), t)).toBeUndefined();
    });
  });

  describe('social profile', () => {
    it('treats only profiles with a URL as linkable', () => {
      const { descriptors } = setUp();

      expect(
        descriptors.socialProfile.linkable?.(aSocialProfile({ profileUrl: 'https://x.dev/@ada' })),
      ).toBe(true);
      expect(descriptors.socialProfile.linkable?.(aSocialProfile({ username: 'ada' }))).toBe(false);
    });
  });
});

describe('hasProfileUrl', () => {
  it('accepts only a non-empty profile URL', () => {
    expect(hasProfileUrl(aSocialProfile({ profileUrl: 'https://social.example/@ada' }))).toBe(true);
    expect(hasProfileUrl(aSocialProfile())).toBe(false);
    expect(hasProfileUrl(aSocialProfile({ profileUrl: '' }))).toBe(false);
  });
});

describe('createFriendAddDetailOptions', () => {
  it('offers every friend sub-resource in display order', () => {
    const { descriptors, collectiveDescriptor } = setUp();

    expect(
      createFriendAddDetailOptions(descriptors, collectiveDescriptor).map((option) => option.key),
    ).toEqual([
      'phone',
      'email',
      'address',
      'url',
      'date',
      'social',
      'circle',
      'collective',
      'professional',
      'relationship',
      'note',
    ]);
  });
});
