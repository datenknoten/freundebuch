import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initI18n } from '$lib/i18n/index.js';
import de from '$lib/i18n/locales/de.json';
import en from '$lib/i18n/locales/en.json';
import { cleanup, render, screen, waitFor } from '$lib/test';
import AppPasswordManager from './app-password-manager.svelte';

const listAppPasswords = vi.fn();
vi.mock('$lib/api/app-passwords', () => ({
  listAppPasswords: (...args: unknown[]) => listAppPasswords(...args),
  createAppPassword: vi.fn(),
  revokeAppPassword: vi.fn(),
}));

// The real locale bundles are loaded on purpose: an assertion against
// `en.profile.appPasswords.*` fails the moment a string is hard-coded in the
// component again, which is exactly the regression this file guards.
const enStrings = en.profile.appPasswords;
const deStrings = de.profile.appPasswords;

describe('AppPasswordManager i18n', () => {
  beforeEach(async () => {
    listAppPasswords.mockResolvedValue([
      {
        externalId: 'ap-1',
        name: 'My iPhone',
        lastUsedAt: null,
        createdAt: '2025-01-15T10:00:00Z',
      },
    ]);
    await initI18n('en');
    await changeLanguage('en');
  });

  afterEach(cleanup);

  it('renders the English locale strings', async () => {
    const { container } = render(AppPasswordManager);

    expect(screen.getByPlaceholderText(enStrings.namePlaceholder)).toBeTruthy();
    expect(screen.getByText(enStrings.create)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(enStrings.revoke)).toBeTruthy();
    });
    expect(container.textContent).toContain('Created');
  });

  it('renders the German locale strings and leaks no English', async () => {
    await changeLanguage('de');
    const { container } = render(AppPasswordManager);

    expect(screen.getByPlaceholderText(deStrings.namePlaceholder)).toBeTruthy();
    expect(screen.getByText(deStrings.create)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(deStrings.revoke)).toBeTruthy();
    });
    expect(container.textContent).toContain('Erstellt');
    expect(screen.queryByText(enStrings.revoke)).toBeNull();
    expect(screen.queryByPlaceholderText(enStrings.namePlaceholder)).toBeNull();
  });

  it('renders the localised empty state', async () => {
    listAppPasswords.mockResolvedValue([]);
    await changeLanguage('de');
    render(AppPasswordManager);

    await waitFor(() => {
      expect(screen.getByText(deStrings.noPasswords)).toBeTruthy();
    });
    expect(screen.getByText(deStrings.noPasswordsSubtitle)).toBeTruthy();
  });

  it('surfaces a localised error when the list request fails', async () => {
    listAppPasswords.mockRejectedValue(new Error(''));
    await changeLanguage('de');
    render(AppPasswordManager);

    await waitFor(() => {
      expect(screen.getByText(deStrings.failedToLoad)).toBeTruthy();
    });
  });
});
