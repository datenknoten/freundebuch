import { readable } from 'svelte/store';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { control, render, useLanguage } from '$lib/test';
import AccountPage from './+page.svelte';

vi.mock('$lib/stores/auth', () => ({
  auth: { updatePreferences: vi.fn() },
  currentUser: readable({ externalId: 'ext-1', email: 'ada@example.com' }),
  birthdayFormat: readable('eu'),
  showShortcutHints: readable(false),
}));

describe('profile account page', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('renders the read-only account fields as labelled disabled inputs', () => {
    render(AccountPage, {});

    const userId = control('user-id') as HTMLInputElement;
    expect(userId.value).toBe('ext-1');
    expect(userId.disabled).toBe(true);
    expect(userId.getAttribute('aria-describedby')).toBe('user-id-helper');
    expect(document.querySelector('label[for="user-id"]')).toBeTruthy();

    const email = control('email') as HTMLInputElement;
    expect(email.value).toBe('ada@example.com');
    expect(email.disabled).toBe(true);
    expect(email.type).toBe('email');
  });
});
