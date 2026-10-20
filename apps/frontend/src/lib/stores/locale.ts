import type { Logger } from 'pino';
import { derived, get, writable } from 'svelte/store';
import {
  changeLanguage,
  getCurrentLanguage,
  initI18n,
  type SupportedLanguage,
} from '$lib/i18n/i18n.js';
import type { AuthStore } from './auth.js';

export interface LocaleStoreOptions {
  auth: AuthStore;
  logger: Logger;
}

export interface LocaleState {
  language: SupportedLanguage;
  isInitialized: boolean;
}

const INITIAL_STATE: LocaleState = {
  language: 'en',
  isInitialized: false,
};

/** The UI language; a signed-in user's choice is stored in their preferences. */
export class LocaleStore {
  private readonly state = writable(INITIAL_STATE);
  public readonly subscribe = this.state.subscribe;
  public readonly currentLanguage = derived(this.state, (state) => state.language);
  public readonly isInitialized = derived(this.state, (state) => state.isInitialized);
  private readonly auth: AuthStore;
  private readonly logger: Logger;

  public constructor(options: LocaleStoreOptions) {
    this.auth = options.auth;
    this.logger = options.logger;
  }

  /** Starts i18n with the user's language, or the detected one when there is none. */
  public async initialize(userLanguage?: SupportedLanguage) {
    await initI18n(userLanguage);
    const language = getCurrentLanguage();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
    this.state.set({ language, isInitialized: true });
    return language;
  }

  /** Persisting the choice for a signed-in user may fail; the language changes regardless. */
  public async setLanguage(language: SupportedLanguage) {
    await changeLanguage(language);
    this.state.update((state) => ({ ...state, language }));
    if (get(this.auth).user === null) {
      return;
    }
    try {
      await this.auth.updatePreferences({ language });
    } catch (err) {
      this.logger.warn({ err }, 'Failed to persist the language preference');
    }
  }

  public getLanguage() {
    return get(this.state).language;
  }
}
