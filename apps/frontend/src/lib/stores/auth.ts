import { derived, writable } from 'svelte/store';
import type { User } from '$shared';
import * as authApi from '../api/auth.js';

/**
 * Auth state interface
 */
interface AuthState {
  user: User | null;
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
