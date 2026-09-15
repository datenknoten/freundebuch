import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initI18n } from '$lib/i18n/index.js';
import de from '$lib/i18n/locales/de.json';
import en from '$lib/i18n/locales/en.json';
import { cleanup, fireEvent, render, screen, waitFor, within } from '$lib/test';
import AppPasswordManager from './app-password-manager.svelte';

const listAppPasswords = vi.fn();
const revokeAppPassword = vi.fn();
vi.mock('$lib/api/app-passwords', () => ({
  listAppPasswords: (...args: unknown[]) => listAppPasswords(...args),
  createAppPassword: vi.fn(),
  revokeAppPassword: (...args: unknown[]) => revokeAppPassword(...args),
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

  it('revokes an app password only after the confirmation dialog', async () => {
    revokeAppPassword.mockResolvedValue(undefined);
    render(AppPasswordManager);

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
