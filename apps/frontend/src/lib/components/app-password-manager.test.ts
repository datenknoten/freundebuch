import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '$lib/app-context.js';
import AppPasswordManager from '$lib/components/AppPasswordManager.svelte';
import { changeLanguage, initI18n } from '$lib/i18n/i18n.js';
import de from '$lib/i18n/locales/de.json';
import en from '$lib/i18n/locales/en.json';
import { cleanup, fireEvent, screen, waitFor, within } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';

const AN_APP_PASSWORD = {
  externalId: 'ap-1',
  name: 'My iPhone',
  lastUsedAt: null,
  createdAt: '2025-01-15T10:00:00Z',
};

// The real locale bundles are loaded on purpose: an assertion against
// `en.profile.appPasswords.*` fails the moment a string is hard-coded in the
// component again, which is exactly the regression this file guards.
const enStrings = en.profile.appPasswords;
const deStrings = de.profile.appPasswords;

function renderManager(context: AppContext) {
  return renderWithContext(AppPasswordManager, { props: {}, context });
}

describe('AppPasswordManager', () => {
  let context: AppContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    context = createTestAppContext();
    vi.spyOn(context.api.appPasswords, 'listAppPasswords').mockResolvedValue([AN_APP_PASSWORD]);
    await initI18n('en');
    await changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('localisation', () => {
    it('renders the English locale strings', async () => {
      const { container } = renderManager(context);

      expect(screen.getByPlaceholderText(enStrings.namePlaceholder)).toBeTruthy();
      expect(screen.getByText(enStrings.create)).toBeTruthy();

      await waitFor(() => expect(screen.getByText(enStrings.revoke)).toBeTruthy());
      expect(container.textContent).toContain('Created');
    });

    it('renders the German locale strings and leaks no English', async () => {
      await changeLanguage('de');
      const { container } = renderManager(context);

      expect(screen.getByPlaceholderText(deStrings.namePlaceholder)).toBeTruthy();
      expect(screen.getByText(deStrings.create)).toBeTruthy();

      await waitFor(() => expect(screen.getByText(deStrings.revoke)).toBeTruthy());
      expect(container.textContent).toContain('Erstellt');
      expect(screen.queryByText(enStrings.revoke)).toBeNull();
      expect(screen.queryByPlaceholderText(enStrings.namePlaceholder)).toBeNull();
    });

    it('renders the localised empty state', async () => {
      vi.spyOn(context.api.appPasswords, 'listAppPasswords').mockResolvedValue([]);
      await changeLanguage('de');
      renderManager(context);

      await waitFor(() => expect(screen.getByText(deStrings.noPasswords)).toBeTruthy());
      expect(screen.getByText(deStrings.noPasswordsSubtitle)).toBeTruthy();
    });

    it('surfaces a localised error when the list request fails', async () => {
      vi.spyOn(context.api.appPasswords, 'listAppPasswords').mockRejectedValue(new Error(''));
      await changeLanguage('de');
      renderManager(context);

      await waitFor(() => expect(screen.getByText(deStrings.failedToLoad)).toBeTruthy());
    });
  });

  describe('revoking', () => {
    it('revokes an app password only after the confirmation dialog', async () => {
      const revokeAppPassword = vi
        .spyOn(context.api.appPasswords, 'revokeAppPassword')
        .mockResolvedValue(undefined);
      renderManager(context);

      await waitFor(() => expect(screen.getByText(enStrings.revoke)).toBeTruthy());
      await fireEvent.click(screen.getByText(enStrings.revoke));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(enStrings.revokeTitle)).toBeTruthy();
      expect(within(dialog).getByText('My iPhone')).toBeTruthy();
      expect(revokeAppPassword).not.toHaveBeenCalled();

      await fireEvent.click(within(dialog).getByText(enStrings.revoke));
      await waitFor(() => expect(revokeAppPassword).toHaveBeenCalledWith('ap-1'));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
  });
});
