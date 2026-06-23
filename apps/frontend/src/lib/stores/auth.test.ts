import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  api: {
    getUserWithPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  authClient: {
    signUp: { email: vi.fn() },
    signIn: { email: vi.fn() },
    signOut: vi.fn(),
  },
  session: {
    setHasSession: vi.fn(),
    resolveSessionExpired: vi.fn(),
    abandonSessionExpired: vi.fn(),
  },
  // Run the wrapped fn directly so updatePreferences persistence is exercised
  // without real backoff timers.
  retryWithBackoff: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('$shared', () => ({}));
vi.mock('../api/auth.js', () => h.api);
vi.mock('../auth-client.js', () => ({ authClient: h.authClient }));
vi.mock('../utils/retry.js', () => ({ retryWithBackoff: h.retryWithBackoff }));
vi.mock('./session.js', () => h.session);

import { auth, currentUser, isAuthenticated, needsOnboarding, userPreferences } from './auth.js';

const userResponse = (overrides: Record<string, unknown> = {}) => ({
  user: {
    externalId: 'u-1',
    email: 'ada@example.com',
    selfProfileId: 'p-1',
    displayName: 'Ada',
    hasCompletedOnboarding: true,
    ...overrides,
  },
  preferences: { friendsPageSize: 50 },
});

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // logout() resets the store to its initial state between tests.
    h.authClient.signOut.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await auth.logout().catch(() => undefined);
  });

  describe('login', () => {
    it('signs in, loads the user, and marks the session active', async () => {
      h.authClient.signIn.email.mockResolvedValue({ error: null });
      h.api.getUserWithPreferences.mockResolvedValue(userResponse());

      const result = await auth.login('ada@example.com', 'pw');

      expect(result).toMatchObject({ externalId: 'u-1' });
      expect(h.session.setHasSession).toHaveBeenCalledWith(true);
      const state = get(auth);
      expect(get(isAuthenticated)).toBe(true);
      expect(get(currentUser)).toMatchObject({ email: 'ada@example.com' });
      expect(get(userPreferences).friendsPageSize).toBe(50);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('throws and records an error when sign-in fails', async () => {
      h.authClient.signIn.email.mockResolvedValue({ error: { message: 'bad creds' } });

      await expect(auth.login('ada@example.com', 'pw')).rejects.toThrow('bad creds');
      expect(get(auth).error).toBe('bad creds');
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('register', () => {
    it('signs up and loads the user', async () => {
      h.authClient.signUp.email.mockResolvedValue({ error: null });
      h.api.getUserWithPreferences.mockResolvedValue(
        userResponse({ hasCompletedOnboarding: false }),
      );

      const result = await auth.register('ada@example.com', 'pw');

      expect(result).toMatchObject({ externalId: 'u-1' });
      expect(h.authClient.signUp.email).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com', name: 'ada' }),
      );
      expect(get(needsOnboarding)).toBe(true);
    });
  });

  describe('logout', () => {
    it('signs out and resets to the initial state', async () => {
      h.authClient.signIn.email.mockResolvedValue({ error: null });
      h.api.getUserWithPreferences.mockResolvedValue(userResponse());
      await auth.login('ada@example.com', 'pw');

      await auth.logout();

      expect(h.session.setHasSession).toHaveBeenLastCalledWith(false);
      expect(h.session.abandonSessionExpired).toHaveBeenCalled();
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('initialize', () => {
    it('hydrates the user when a session exists', async () => {
      h.api.getUserWithPreferences.mockResolvedValue(userResponse());

      const result = await auth.initialize();

      expect(result).toMatchObject({ user: { externalId: 'u-1' } });
      expect(get(isAuthenticated)).toBe(true);
    });

    it('finishes initialized with no user when there is no session', async () => {
      h.api.getUserWithPreferences.mockRejectedValue(new Error('401'));

      const result = await auth.initialize();

      expect(result).toBeNull();
      expect(h.session.setHasSession).toHaveBeenLastCalledWith(false);
      expect(get(auth).isInitialized).toBe(true);
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('optimistically updates then persists the server response', async () => {
      h.api.updatePreferences.mockResolvedValue({ preferences: { friendsPageSize: 100 } });

      await auth.updatePreferences({ friendsPageSize: 100 });

      expect(h.api.updatePreferences).toHaveBeenCalledWith({ friendsPageSize: 100 });
      expect(get(userPreferences).friendsPageSize).toBe(100);
    });
  });

  describe('clearError', () => {
    it('clears a recorded error', async () => {
      h.authClient.signIn.email.mockResolvedValue({ error: { message: 'bad' } });
      await expect(auth.login('a@b.c', 'pw')).rejects.toThrow();

      auth.clearError();

      expect(get(auth).error).toBeNull();
    });
  });
});
