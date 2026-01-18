import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { createI18nStore } from 'svelte-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

export const defaultNS = 'translation';
export const supportedLanguages = ['en', 'de'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

/**
 * Initialize i18next with the given language or auto-detect
 */
export function initI18n(initialLanguage?: SupportedLanguage) {
  i18next.use(LanguageDetector).init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS,
    interpolation: {
      escapeValue: false, // Svelte already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'freundebuch-language',
    },
  });

  return i18next;
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  const lang = i18next.language;
  // Handle language codes like 'en-US' -> 'en'
  const shortLang = lang?.split('-')[0] as SupportedLanguage;
  return supportedLanguages.includes(shortLang) ? shortLang : 'en';
}

/**
 * Change the current language
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18next.changeLanguage(lang);
  // Update HTML lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
  // Store in localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('freundebuch-language', lang);
  }
}

/**
 * Check if a language is supported
 */
export function isSupported(lang: string): lang is SupportedLanguage {
  return supportedLanguages.includes(lang as SupportedLanguage);
}

/**
 * Create the i18n store for Svelte components
 * This creates a reactive store that updates when language changes
 */
export function createI18n() {
  return createI18nStore(i18next);
}

export { i18next };
