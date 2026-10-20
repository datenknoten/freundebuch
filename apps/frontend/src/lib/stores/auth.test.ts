import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserWithPreferencesResponse } from '$shared';
import { ApiClient } from '../api/api-client.js';
import { AuthApi } from '../api/auth.js';
import { createAppAuthClient } from '../auth-client.js';
import { AuthStore } from './auth.js';
import { SessionStore } from './session.js';

// Runs the wrapped call once, so persisting preferences needs no backoff timers.
function createRetryFake() {
  return { retryWithBackoff: vi.fn((persist: () => Promise<unknown>) => persist()) };
}

const h = vi.hoisted(createRetryFake);

vi.mock('../utils/retry.js', () => ({ retryWithBackoff: h.retryWithBackoff }));

const ADA: UserWithPreferencesResponse = {
  user: {
    externalId: 'u-1',
    email: 'ada@example.com',
    selfProfileId: 'p-1',
    displayName: 'Ada',
    hasCompletedOnboarding: true,
  },
  preferences: { friendsPageSize: 50 },
};

/** Better Auth answers by path; every path without an answer fails with 500. */
const betterAuthAnswers = new Map<string, Response>();

async function answerBetterAuth(input: RequestInfo | URL) {
  const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost');
  return betterAuthAnswers.get(url.pathname) ?? new Response('{}', { status: 500 });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function stayUnauthenticated() {
  return false;
}

function createAuthStore() {
  const logger = createRootLogger({ LOG_LEVEL: 'silent' });
  const authApi = new AuthApi({
    client: new ApiClient({ baseUrl: '', logger, onUnauthorized: stayUnauthenticated }),
  });
  const session = new SessionStore();
  const auth = new AuthStore({ authApi, authClient: createAppAuthClient(''), session, logger });
  return { auth, authApi, session };
}

describe('AuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    betterAuthAnswers.clear();
    vi.stubGlobal('fetch', vi.fn(answerBetterAuth));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('signs in, loads the user and marks the session active', async () => {
      const { auth, authApi, session } = createAuthStore();
      betterAuthAnswers.set('/api/auth/sign-in/email', json({ token: 't', user: {} }));
      vi.spyOn(authApi, 'getUserWithPreferences').mockResolvedValue(ADA);
      const setHasSession = vi.spyOn(session, 'setHasSession');

      await expect(auth.login('ada@example.com', 'pw')).resolves.toMatchObject({
        externalId: 'u-1',
      });
      expect(setHasSession).toHaveBeenCalledWith(true);
      expect(get(auth.isAuthenticated)).toBe(true);
      expect(get(auth.friendsPageSize)).toBe(50);
      expect(get(auth)).toMatchObject({ isLoading: false, isInitialized: true });
    });

    it('records the Better Auth message and rethrows when sign-in fails', async () => {
      const { auth } = createAuthStore();
      betterAuthAnswers.set(
        '/api/auth/sign-in/email',
        json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'bad creds' }, 401),
      );

      await expect(auth.login('ada@example.com', 'pw')).rejects.toThrow('bad creds');
      expect(get(auth).error).toBe('bad creds');
      expect(get(auth.isAuthenticated)).toBe(false);
    });
  });

  describe('register', () => {
    it('signs up and flags a user without self-profile for onboarding', async () => {
      const { auth, authApi } = createAuthStore();
      betterAuthAnswers.set('/api/auth/sign-up/email', json({ token: 't', user: {} }));
      vi.spyOn(authApi, 'getUserWithPreferences').mockResolvedValue({
        ...ADA,
        user: { ...ADA.user, hasCompletedOnboarding: false },
      });

      await auth.register('ada@example.com', 'pw');

      expect(get(auth.needsOnboarding)).toBe(true);
    });
  });

  describe('logout', () => {
    it('signs out, rejects parked requests and resets the state', async () => {
      const { auth, authApi, session } = createAuthStore();
      vi.spyOn(authApi, 'getUserWithPreferences').mockResolvedValue(ADA);
      await auth.initialize();
      betterAuthAnswers.set('/api/auth/sign-out', json({ success: true }));
      const parked = session.notifyUnauthorized();

      await auth.logout();

      await expect(parked).resolves.toBe(false);
      expect(get(auth.isAuthenticated)).toBe(false);
      expect(get(auth.isInitialized)).toBe(false);
    });
  });

  describe('initialize', () => {
    it('restores the user of an existing session', async () => {
      const { auth, authApi } = createAuthStore();
      vi.spyOn(authApi, 'getUserWithPreferences').mockResolvedValue(ADA);

      await expect(auth.initialize()).resolves.toMatchObject({ externalId: 'u-1' });
      expect(get(auth.currentUser)).toMatchObject({ email: 'ada@example.com' });
    });

    it('finishes signed out when the session check fails', async () => {
      const { auth, authApi } = createAuthStore();
      vi.spyOn(authApi, 'getUserWithPreferences').mockRejectedValue(new Error('401'));

      await expect(auth.initialize()).resolves.toBeUndefined();
      expect(get(auth)).toMatchObject({ user: null, isInitialized: true, isLoading: false });
    });
  });

  describe('updatePreferences', () => {
    it('applies the change at once and then takes the stored preferences', async () => {
      const { auth, authApi } = createAuthStore();
      vi.spyOn(authApi, 'updatePreferences').mockResolvedValue({
        preferences: { friendsPageSize: 100, birthdayFormat: 'eu' },
      });

      await auth.updatePreferences({ friendsPageSize: 100 });

      expect(get(auth.friendsPageSize)).toBe(100);
      expect(get(auth.birthdayFormat)).toBe('eu');
    });
  });

  describe('clearError', () => {
    it('clears a recorded error', async () => {
      const { auth } = createAuthStore();
      betterAuthAnswers.set('/api/auth/sign-in/email', json({ message: 'bad' }, 401));
      await expect(auth.login('a@b.c', 'pw')).rejects.toThrow();

      auth.clearError();

      expect(get(auth).error).toBeNull();
    });
  });
});
