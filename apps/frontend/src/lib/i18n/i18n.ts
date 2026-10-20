import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { createI18nStore } from 'svelte-i18next';
import de from '$lib/i18n/locales/de.json';
import en from '$lib/i18n/locales/en.json';

export const DEFAULT_NS = 'translation';
export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

const LANGUAGE_STORAGE_KEY = 'freundebuch-language';

/** Without `initialLanguage` the language comes from localStorage, then from the browser. */
export async function initI18n(initialLanguage?: SupportedLanguage) {
  await i18next.use(LanguageDetector).init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS: DEFAULT_NS,
    interpolation: {
      // Svelte already escapes.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

  return i18next;
}

export function isSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supported) => supported === lang);
}

/** The active language without its region (`en-US` → `en`); `en` when it is not supported. */
export function getCurrentLanguage() {
  const shortLang = i18next.language?.split('-')[0] ?? '';
  return isSupported(shortLang) === true ? shortLang : 'en';
}

/** Also sets the `lang` attribute of the document and remembers the choice in localStorage. */
export async function changeLanguage(lang: SupportedLanguage) {
  await i18next.changeLanguage(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }
}

/** A Svelte store of the i18next instance that updates when the language changes. */
export function createI18n() {
  return createI18nStore(i18next);
}
