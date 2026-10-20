import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useLanguage } from '$lib/test/locale.js';
import { control, fireEvent, screen, tick, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import DisplayPage from './+page.svelte';

async function createSignedInContext() {
  const context = createTestAppContext();
  vi.spyOn(context.api.auth, 'getUserWithPreferences').mockResolvedValue({
    user: { externalId: 'ext-1', email: 'ada@example.com', hasCompletedOnboarding: true },
    preferences: { birthdayFormat: 'eu', showShortcutHints: false, defaultCountry: 'DE' },
  });
  await context.stores.auth.initialize();
  return context;
}

describe('profile display page', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reflects the stored preferences and writes changes through', async () => {
    const context = await createSignedInContext();
    const updatePreferences = vi
      .spyOn(context.stores.auth, 'updatePreferences')
      .mockResolvedValue(undefined);
    renderWithContext(DisplayPage, { props: {}, context });

    const language = control('language') as HTMLSelectElement;
    expect(language.value).toBe('en');
    expect(language.options.length).toBeGreaterThan(1);

    const format = control('birthday-format') as HTMLSelectElement;
    expect(format.value).toBe('eu');

    const hints = control('shortcut-hints') as HTMLInputElement;
    expect(hints.type).toBe('checkbox');
    expect(hints.checked).toBe(false);

    await fireEvent.change(format, { target: { value: 'long' } });
    await tick();
    expect(updatePreferences).toHaveBeenCalledWith({ birthdayFormat: 'long' });
    await waitFor(() => {
      expect(screen.getByRole('status').textContent?.trim().length).toBeGreaterThan(0);
    });

    await fireEvent.click(hints);
    await tick();
    expect(updatePreferences).toHaveBeenCalledWith({ showShortcutHints: true });

    const country = control('default-country') as HTMLSelectElement;
    expect(country.value).toBe('DE');
    await fireEvent.change(country, { target: { value: 'AT' } });
    await tick();
    expect(updatePreferences).toHaveBeenCalledWith({ defaultCountry: 'AT' });
    await fireEvent.change(country, { target: { value: '' } });
    await tick();
    expect(updatePreferences).toHaveBeenCalledWith({ defaultCountry: null });
  });
});
