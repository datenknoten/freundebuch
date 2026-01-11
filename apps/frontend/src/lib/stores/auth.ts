import { derived, writable } from 'svelte/store';
import type { User, UserPreferences } from '$shared';
import * as authApi from '../api/auth.js';
import { retryWithBackoff } from '../utils/retry.js';

/** Default user preferences */
const DEFAULT_PREFERENCES: UserPreferences = {
  contactsPageSize: 25,
};

/**
 * Auth state interface
 */
interface AuthState {
  user: User | null;
  preferences: UserPreferences;
  accessToken: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  preferences: DEFAULT_PREFERENCES,
  accessToken: null,
  sessionToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

/**
 * Create the auth store
 */
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    /**
     * Register a new user
     */
    register: async (email: string, password: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await authApi.register({ email, password });

        update((state) => ({
          ...state,
          user: result.user,
          accessToken: result.accessToken,
          sessionToken: result.sessionToken,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof authApi.ApiError ? error.message : 'Registration failed';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Login an existing user
     */
    login: async (email: string, password: string) => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await authApi.login({ email, password });

        update((state) => ({
          ...state,
          user: result.user,
          accessToken: result.accessToken,
          sessionToken: result.sessionToken,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof authApi.ApiError ? error.message : 'Login failed';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Logout the current user
     */
    logout: async () => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        await authApi.logout();

        set(initialState);
      } catch (error) {
        const errorMessage = error instanceof authApi.ApiError ? error.message : 'Logout failed';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Refresh the access token
     */
    refresh: async () => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await authApi.refresh();

        update((state) => ({
          ...state,
          user: result.user,
          preferences: { ...DEFAULT_PREFERENCES, ...result.user.preferences },
          accessToken: result.accessToken,
          sessionToken: result.sessionToken,
          isLoading: false,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof authApi.ApiError ? error.message : 'Token refresh failed';

        update((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    },

    /**
     * Initialize auth state (e.g., on app load)
     * Attempts to refresh the session if a cookie exists
     */
    initialize: async () => {
      update((state) => ({ ...state, isLoading: true }));

      try {
        const result = await authApi.refresh();

        update((state) => ({
          ...state,
          user: result.user,
          preferences: { ...DEFAULT_PREFERENCES, ...result.user.preferences },
          accessToken: result.accessToken,
          sessionToken: result.sessionToken,
          isLoading: false,
          isInitialized: true,
          error: null,
        }));

        return result;
      } catch {
        // Not an error if there's no valid session
        update((state) => ({
          ...state,
          isLoading: false,
          isInitialized: true,
          error: null,
        }));

        return null;
      }
    },

    /**
     * Clear any auth errors
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Update user preferences
     * Uses exponential backoff retry, fails silently after max attempts
     */
    updatePreferences: async (newPreferences: Partial<UserPreferences>) => {
      // Optimistically update the store immediately
      update((state) => ({
        ...state,
        preferences: { ...state.preferences, ...newPreferences },
      }));

      // Persist to server with retry
      await retryWithBackoff(
        async () => {
          const result = await authApi.updatePreferences(newPreferences);
          // Update with server response (in case of any transformations)
          update((state) => ({
            ...state,
            preferences: { ...DEFAULT_PREFERENCES, ...result.preferences },
          }));
          return result;
        },
        {
          maxAttempts: 5,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Preferences update failed (attempt ${attempt}):`, error.message);
          },
        },
      );
    },

    /**
     * Load preferences from server
     * Called during initialization after auth is confirmed
     */
    loadPreferences: async () => {
      try {
        const result = await authApi.getUserWithPreferences();
        update((state) => ({
          ...state,
          preferences: { ...DEFAULT_PREFERENCES, ...result.preferences },
        }));
      } catch (error) {
        // Silently fail - use defaults
        console.warn('Failed to load preferences:', error);
      }
    },

    /**
     * Refresh user data from server
     * Used after onboarding completion to update hasCompletedOnboarding
     */
    refreshUserData: async () => {
      try {
        const user = await authApi.getCurrentUser();
        update((state) => ({
          ...state,
          user,
          preferences: { ...DEFAULT_PREFERENCES, ...user.preferences },
        }));
        return user;
      } catch (error) {
        console.warn('Failed to refresh user data:', error);
        throw error;
      }
    },
  };
}

/**
 * The global auth store
 */
export const auth = createAuthStore();

/**
 * Derived store for authenticated state
 */
export const isAuthenticated = derived(auth, ($auth) => $auth.user !== null);

/**
 * Derived store for current user
 */
export const currentUser = derived(auth, ($auth) => $auth.user);

/**
 * Derived store for initialization state
 */
export const isAuthInitialized = derived(auth, ($auth) => $auth.isInitialized);

/**
 * Derived store for user preferences
 */
export const userPreferences = derived(auth, ($auth) => $auth.preferences);

/**
 * Derived store for contacts page size
 */
export const contactsPageSize = derived(auth, ($auth) => $auth.preferences.contactsPageSize ?? 25);

/**
 * Helper to wait for auth initialization
 * Returns a promise that resolves when auth is initialized
 */
export function waitForAuthInit(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = auth.subscribe((state) => {
      if (state.isInitialized) {
        unsubscribe();
        resolve();
      }
    });
  });
}

/**
 * Convenience function to refresh user data
 * Used after onboarding completion
 */
export async function refreshUserData() {
  return auth.refreshUserData();
}

/**
 * Derived store for onboarding status
 * Returns true if user needs to complete onboarding
 */
export const needsOnboarding = derived(
  auth,
  ($auth) => $auth.user !== null && !$auth.user.hasCompletedOnboarding,
);
