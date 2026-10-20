import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aFriend } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { AuthApi } from './auth.js';

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
  return new AuthApi({ client: createClient() });
}

describe('AuthApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getUserWithPreferences', () => {
    it('returns the user with their preferences', async () => {
      const body = {
        user: { externalId: 'u-1', email: 'ada@example.com', hasCompletedOnboarding: true },
        preferences: { friendsPageSize: 50 },
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(body));

      await expect(createApi().getUserWithPreferences()).resolves.toEqual(body);
    });

    it('throws ValidationError when the user lacks the onboarding flag', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ user: { externalId: 'u-1', email: 'ada@example.com' }, preferences: {} }),
      );

      await expect(createApi().getUserWithPreferences()).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('updatePreferences', () => {
    it('throws ValidationError when a preference has an unknown value', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ preferences: { birthdayFormat: 'roman' } }));

      await expect(createApi().updatePreferences({ friendsPageSize: 50 })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('createSelfProfile', () => {
    it('sends the friend as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aFriend({ displayName: 'Ada' }), 201));

      await createApi().createSelfProfile({ displayName: 'Ada', nameFirst: 'Ada' });

      expect(JSON.parse(String(sentRequest()[1]?.body))).toEqual({
        display_name: 'Ada',
        name_first: 'Ada',
      });
    });
  });
});
