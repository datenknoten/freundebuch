import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock factories are hoisted above module scope, so the shared mocks must be
// created inside vi.hoisted() (which runs first) rather than as outer consts.
const mocks = vi.hoisted(() => {
  let authValue: { user: unknown } = { user: null };
  const subscribers = new Set<(v: { user: unknown }) => void>();
  const authStore = {
    subscribe(run: (v: { user: unknown }) => void) {
      subscribers.add(run);
      run(authValue);
      return () => subscribers.delete(run);
    },
    set(v: { user: unknown }) {
      authValue = v;
      for (const run of subscribers) run(authValue);
    },
  };
  return {
    initI18n: vi.fn(async () => {}),
    changeLanguage: vi.fn(async () => {}),
    getCurrentLanguage: vi.fn(() => 'en'),
    updatePreferences: vi.fn(async () => {}),
    authStore,
  };
});

vi.mock('$lib/i18n/index.js', () => ({
  initI18n: mocks.initI18n,
  changeLanguage: mocks.changeLanguage,
  getCurrentLanguage: mocks.getCurrentLanguage,
  supportedLanguages: ['en', 'de'],
}));

vi.mock('./auth.js', () => ({
  auth: { subscribe: mocks.authStore.subscribe, updatePreferences: mocks.updatePreferences },
}));

import { currentLanguage, isLocaleInitialized, locale } from './locale.js';

describe('locale store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentLanguage.mockReturnValue('en');
    mocks.authStore.set({ user: null });
  });

  describe('initialize', () => {
    it('initializes i18n, records the detected language, and sets <html lang>', async () => {
      mocks.getCurrentLanguage.mockReturnValue('de');

      const detected = await locale.initialize('de');

      expect(mocks.initI18n).toHaveBeenCalledWith('de');
      expect(detected).toBe('de');
      expect(get(currentLanguage)).toBe('de');
      expect(get(isLocaleInitialized)).toBe(true);
      expect(document.documentElement.lang).toBe('de');
    });
  });

  describe('setLanguage', () => {
    it('changes the language and updates the store', async () => {
      await locale.setLanguage('de');

      expect(mocks.changeLanguage).toHaveBeenCalledWith('de');
      expect(get(currentLanguage)).toBe('de');
      expect(locale.getLanguage()).toBe('de');
    });

    it('persists the preference when authenticated', async () => {
      mocks.authStore.set({ user: { id: 'u-1' } });

      await locale.setLanguage('de');

      expect(mocks.updatePreferences).toHaveBeenCalledWith({ language: 'de' });
    });

    it('does not persist the preference when unauthenticated', async () => {
      mocks.authStore.set({ user: null });

      await locale.setLanguage('de');

      expect(mocks.updatePreferences).not.toHaveBeenCalled();
    });

    it('swallows a failure to persist the preference', async () => {
      mocks.authStore.set({ user: { id: 'u-1' } });
      mocks.updatePreferences.mockRejectedValueOnce(new Error('network'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(locale.setLanguage('de')).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });
});
