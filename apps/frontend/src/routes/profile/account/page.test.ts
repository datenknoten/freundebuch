import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import AccountPage from './+page.svelte';

async function createSignedInContext() {
  const context = createTestAppContext();
  vi.spyOn(context.api.auth, 'getUserWithPreferences').mockResolvedValue({
    user: { externalId: 'ext-1', email: 'ada@example.com', hasCompletedOnboarding: true },
    preferences: { birthdayFormat: 'eu', showShortcutHints: false, defaultCountry: 'DE' },
  });
  await context.stores.auth.initialize();
  return context;
}

describe('profile account page', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the read-only account fields as labelled disabled inputs', async () => {
    renderWithContext(AccountPage, { props: {}, context: await createSignedInContext() });

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
