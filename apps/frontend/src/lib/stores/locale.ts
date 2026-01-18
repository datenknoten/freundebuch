import { derived, get, writable } from 'svelte/store';
import {
  changeLanguage,
  getCurrentLanguage,
  initI18n,
  type SupportedLanguage,
  supportedLanguages,
} from '$lib/i18n/index.js';
import { auth } from './auth.js';

interface LocaleState {
  language: SupportedLanguage;
  isInitialized: boolean;
}

const initialState: LocaleState = {
  language: 'en',
  isInitialized: false,
};

/**
 * Create the locale store
 */
function createLocaleStore() {
  const { subscribe, set, update } = writable<LocaleState>(initialState);

  return {
    subscribe,

    /**
     * Initialize i18n with user's preference or auto-detect
     */
    initialize: async (userLanguage?: SupportedLanguage) => {
      // Initialize i18next with user's preference or auto-detect
      initI18n(userLanguage);
      const detectedLang = getCurrentLanguage();

      // Update document lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = detectedLang;
      }

      set({
        language: detectedLang,
        isInitialized: true,
      });

      return detectedLang;
    },

    /**
     * Change the current language
     */
    setLanguage: async (lang: SupportedLanguage) => {
      await changeLanguage(lang);

      update((state) => ({
        ...state,
        language: lang,
      }));

      // Update user preferences if authenticated
      const authState = get(auth);
      if (authState.user) {
        try {
          await auth.updatePreferences({ language: lang });
        } catch (error) {
          console.warn('Failed to persist language preference:', error);
        }
      }
    },

    /**
     * Get the current language
     */
    getLanguage: (): SupportedLanguage => {
      return get({ subscribe }).language;
    },
  };
}

/**
 * The global locale store
 */
export const locale = createLocaleStore();

/**
 * Derived store for current language
 */
export const currentLanguage = derived(locale, ($locale) => $locale.language);

/**
 * Derived store for initialization state
 */
export const isLocaleInitialized = derived(locale, ($locale) => $locale.isInitialized);

/**
 * Export supported languages for use in UI
 */
export { supportedLanguages, type SupportedLanguage };
