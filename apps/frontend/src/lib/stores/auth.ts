import type { Logger } from 'pino';
import { derived, writable } from 'svelte/store';
import type { UserPreferences, UserResponse, UserWithPreferencesResponse } from '$shared';
import type { AuthApi } from '../api/auth.js';
import type { AuthClient } from '../auth-client.js';
import { AuthError } from '../errors/auth.error.js';
import { retryWithBackoff } from '../utils/retry.js';
import type { SessionStore } from './session.js';

export interface AuthStoreOptions {
  authApi: AuthApi;
  authClient: AuthClient;
  session: SessionStore;
  logger: Logger;
}

export interface AuthState {
  /** `null` while signed out. */
  user: UserResponse | null;
  preferences: UserPreferences;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  friendsPageSize: 25,
};

const INITIAL_STATE: AuthState = {
  user: null,
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  isInitialized: false,
  error: null,
};

const PREFERENCES_RETRY_ATTEMPTS = 5;
const PREFERENCES_RETRY_DELAY_MS = 1000;

function toUser(result: UserWithPreferencesResponse) {
  return {
    externalId: result.user.externalId,
    email: result.user.email,
    selfProfileId: result.user.selfProfileId,
    displayName: result.user.displayName,
    hasCompletedOnboarding: result.user.hasCompletedOnboarding,
    preferences: result.preferences,
  } satisfies UserResponse;
}

function withDefaults(preferences: UserPreferences | undefined) {
  return { ...DEFAULT_PREFERENCES, ...preferences };
}

/**
 * The signed-in user and their preferences. Signing up, in and out goes through Better Auth;
 * the user data comes from the backend's `/api/auth/me`.
 */
export class AuthStore {
  private readonly state = writable(INITIAL_STATE);
  public readonly subscribe = this.state.subscribe;
  public readonly isAuthenticated = derived(this.state, (state) => state.user !== null);
  public readonly currentUser = derived(this.state, (state) => state.user);
  public readonly isInitialized = derived(this.state, (state) => state.isInitialized);
  public readonly preferences = derived(this.state, (state) => state.preferences);
  public readonly friendsPageSize = derived(
    this.state,
    (state) => state.preferences.friendsPageSize ?? 25,
  );
  public readonly friendsTableColumns = derived(
    this.state,
    (state) => state.preferences.friendsTableColumns ?? null,
  );
  public readonly birthdayFormat = derived(
    this.state,
    (state) => state.preferences.birthdayFormat ?? 'iso',
  );
  public readonly showShortcutHints = derived(
    this.state,
    (state) => state.preferences.showShortcutHints ?? true,
  );
  /** The ISO code preselected for new addresses, `null` when the user chose none. */
  public readonly defaultCountry = derived(
    this.state,
    (state) => state.preferences.defaultCountry ?? null,
  );
  public readonly needsOnboarding = derived(
    this.state,
    (state) => state.user !== null && state.user.hasCompletedOnboarding === false,
  );
  private readonly authApi: AuthApi;
  private readonly authClient: AuthClient;
  private readonly session: SessionStore;
  private readonly logger: Logger;

  public constructor(options: AuthStoreOptions) {
    this.authApi = options.authApi;
    this.authClient = options.authClient;
    this.session = options.session;
    this.logger = options.logger;
  }

  public async register(email: string, password: string) {
    this.startLoading();
    try {
      const result = await this.authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0] ?? '',
      });
      if (result.error !== null) {
        throw new AuthError(result.error.message ?? 'Registration failed');
      }
      return await this.signedIn();
    } catch (error) {
      this.fail(error, 'Registration failed');
      throw error;
    }
  }

  public async login(email: string, password: string) {
    this.startLoading();
    try {
      const result = await this.authClient.signIn.email({ email, password });
      if (result.error !== null) {
        throw new AuthError(result.error.message ?? 'Login failed');
      }
      return await this.signedIn();
    } catch (error) {
      this.fail(error, 'Login failed');
      throw error;
    }
  }

  public async logout() {
    this.startLoading();
    try {
      await this.authClient.signOut();
      this.session.setHasSession(false);
      this.session.abandonSessionExpired();
      this.state.set(INITIAL_STATE);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      this.state.update((state) => ({ ...state, isLoading: false, error: message }));
      throw error;
    }
  }

  /**
   * Restores the session on app load. `/api/auth/me` validates the session itself, so a
   * separate Better Auth session request would only delay the first render.
   */
  public async initialize() {
    this.state.update((state) => ({ ...state, isLoading: true }));
    const user = await this.findUser();
    if (user !== undefined) {
      this.applyUser(user);
      return user;
    }
    this.session.setHasSession(false);
    this.state.update((state) => ({
      ...state,
      isLoading: false,
      isInitialized: true,
      error: null,
    }));
    return undefined;
  }

  public clearError() {
    this.state.update((state) => ({ ...state, error: null }));
  }

  /**
   * Applies the change at once and persists it in the background with exponential backoff;
   * after the last failed attempt the change stays local.
   */
  public async updatePreferences(changes: UserPreferences) {
    this.state.update((state) => ({ ...state, preferences: { ...state.preferences, ...changes } }));
    const logger = this.logger;
    await retryWithBackoff(() => this.persistPreferences(changes), {
      maxAttempts: PREFERENCES_RETRY_ATTEMPTS,
      initialDelay: PREFERENCES_RETRY_DELAY_MS,
      onRetry(attempt, err) {
        logger.warn({ err, attempt }, 'Preferences update failed');
      },
    });
  }

  /** Reloads the user, for example once the onboarding completed. */
  public async refreshUserData() {
    try {
      const user = await this.authApi.getCurrentUser();
      this.state.update((state) => ({
        ...state,
        user,
        preferences: withDefaults(user.preferences),
      }));
      return user;
    } catch (err) {
      this.logger.warn({ err }, 'Failed to refresh user data');
      throw err;
    }
  }

  private startLoading() {
    this.state.update((state) => ({ ...state, isLoading: true, error: null }));
  }

  private fail(error: unknown, fallbackMessage: string) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    this.state.update((state) => ({
      ...state,
      isLoading: false,
      isInitialized: true,
      error: message,
    }));
  }

  private async signedIn() {
    const user = await this.findUser();
    if (user !== undefined) {
      this.applyUser(user);
    }
    return user;
  }

  /** Resolves `undefined` on any failure, a 401 without a session included. */
  private async findUser() {
    try {
      return toUser(await this.authApi.getUserWithPreferences());
    } catch {
      return undefined;
    }
  }

  private applyUser(user: UserResponse) {
    this.session.setHasSession(true);
    this.session.resolveSessionExpired();
    this.state.update((state) => ({
      ...state,
      user,
      preferences: withDefaults(user.preferences),
      isLoading: false,
      isInitialized: true,
      error: null,
    }));
  }

  private async persistPreferences(changes: UserPreferences) {
    const result = await this.authApi.updatePreferences(changes);
    this.state.update((state) => ({ ...state, preferences: withDefaults(result.preferences) }));
    return result;
  }
}
