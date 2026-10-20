import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../api/api-client.js';
import { AuthApi } from '../api/auth.js';
import { createAppAuthClient } from '../auth-client.js';
import { AuthStore } from './auth.js';
import { LocaleStore } from './locale.js';
import { SessionStore } from './session.js';

function createI18nFake() {
  return {
    initI18n: vi.fn(async () => undefined),
    changeLanguage: vi.fn(async () => undefined),
    getCurrentLanguage: vi.fn(() => 'en'),
  };
}

const h = vi.hoisted(createI18nFake);

vi.mock('$lib/i18n/i18n.js', () => h);

async function stayUnauthenticated() {
  return false;
}

function createLocaleStore() {
  const logger = createRootLogger({ LOG_LEVEL: 'silent' });
  const authApi = new AuthApi({
    client: new ApiClient({ baseUrl: '', logger, onUnauthorized: stayUnauthenticated }),
  });
  const auth = new AuthStore({
    authApi,
    authClient: createAppAuthClient(''),
    session: new SessionStore(),
    logger,
  });
  return { locale: new LocaleStore({ auth, logger }), auth, authApi };
}

async function signIn(auth: AuthStore, authApi: AuthApi) {
  vi.spyOn(authApi, 'getUserWithPreferences').mockResolvedValue({
    user: { externalId: 'u-1', email: 'ada@example.com', hasCompletedOnboarding: true },
    preferences: {},
  });
  await auth.initialize();
}

describe('LocaleStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('starts i18n and records the detected language on <html lang>', async () => {
      h.getCurrentLanguage.mockReturnValue('de');
      const { locale } = createLocaleStore();

      await expect(locale.initialize('de')).resolves.toBe('de');
      expect(h.initI18n).toHaveBeenCalledWith('de');
      expect(get(locale.currentLanguage)).toBe('de');
      expect(get(locale.isInitialized)).toBe(true);
      expect(document.documentElement.lang).toBe('de');
    });
  });

  describe('setLanguage', () => {
    it('changes the language without persisting it while signed out', async () => {
      const { locale, authApi } = createLocaleStore();
      const updatePreferences = vi.spyOn(authApi, 'updatePreferences');

      await locale.setLanguage('de');

      expect(locale.getLanguage()).toBe('de');
      expect(updatePreferences).not.toHaveBeenCalled();
    });

    it('persists the language of a signed-in user', async () => {
      const { locale, auth, authApi } = createLocaleStore();
      await signIn(auth, authApi);
      const updatePreferences = vi
        .spyOn(authApi, 'updatePreferences')
        .mockResolvedValue({ preferences: { language: 'de' } });

      await locale.setLanguage('de');

      expect(updatePreferences).toHaveBeenCalledWith({ language: 'de' });
    });

    it('keeps the new language when persisting it fails', async () => {
      const { locale, auth, authApi } = createLocaleStore();
      await signIn(auth, authApi);
      vi.spyOn(auth, 'updatePreferences').mockRejectedValue(new Error('network'));

      await expect(locale.setLanguage('de')).resolves.toBeUndefined();
      expect(get(locale.currentLanguage)).toBe('de');
    });
  });
});
