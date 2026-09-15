import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/client';
import { friends } from '$lib/stores/friends';
import type { SocialProfile } from '$shared';
import {
  addressDescriptor,
  friendAddDetailOptions,
  hasProfileUrl,
  phoneDescriptor,
  socialProfileDescriptor,
} from './subresource-descriptors';

// The address descriptor refetches the friend through the store, so the store
// is the only collaborator worth mocking here.
vi.mock('$lib/stores/friends', () => ({
  friends: { loadFriend: vi.fn().mockResolvedValue(undefined) },
}));

// i18n stubbed as an echo so the mapped keys are observable.
const t = (key: string) => key;

const aSocialProfile = (overrides: Partial<SocialProfile> = {}): SocialProfile => ({
  id: 'social-1',
  platform: 'github',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('friend subresource descriptors', () => {
  it('refetches the friend a few times after an address save so geocoding lands', () => {
    addressDescriptor.afterSave?.(async () => undefined, 'f1');

    expect(friends.loadFriend).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(friends.loadFriend).toHaveBeenCalledTimes(3);
    expect(friends.loadFriend).toHaveBeenNthCalledWith(1, 'f1');
    expect(friends.loadFriend).toHaveBeenNthCalledWith(2, 'f1');
    expect(friends.loadFriend).toHaveBeenNthCalledWith(3, 'f1');
  });

  it('maps phone validation failures to the field hints', () => {
    expect(
      phoneDescriptor.mapError?.(new ApiError(400, 'Invalid phone number', 'VALIDATION_ERROR'), t),
    ).toBe('subresources.phone.invalidNumber');
    expect(phoneDescriptor.mapError?.(new ApiError(422, 'nope', 'PHONE_COUNTRY_UNKNOWN'), t)).toBe(
      'subresources.phone.unknownCountry',
    );
    expect(phoneDescriptor.mapError?.(new ApiError(500, 'boom'), t)).toBeUndefined();
    expect(phoneDescriptor.mapError?.(new Error('offline'), t)).toBeUndefined();
  });

  it('treats only social profiles with a URL as linkable', () => {
    expect(hasProfileUrl(aSocialProfile({ profileUrl: 'https://social.example/@ada' }))).toBe(true);
    expect(hasProfileUrl(aSocialProfile())).toBe(false);
    expect(hasProfileUrl(aSocialProfile({ profileUrl: '' }))).toBe(false);

    expect(
      socialProfileDescriptor.linkable?.(aSocialProfile({ profileUrl: 'https://x.dev/@ada' })),
    ).toBe(true);
    expect(socialProfileDescriptor.linkable?.(aSocialProfile({ username: 'ada' }))).toBe(false);
  });

  it('offers every friend sub-resource in the add-detail menu', () => {
    expect(friendAddDetailOptions.map((option) => option.key)).toEqual([
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
    ]);
  });
});
