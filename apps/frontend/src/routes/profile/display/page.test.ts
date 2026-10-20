import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { useLanguage } from '$lib/test/locale.js';
import { control, fireEvent, screen, tick, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
// biome-ignore lint/correctness/useImportExtensions: routes have no alias, and the fix would rewrite the component import to `.js`
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

function selectControl(id: string) {
  const select = control(id);
  if (select instanceof HTMLSelectElement) {
    return select;
  }
  throw new InvariantError(`the ${id} control is not a select`);
}

function inputControl(id: string) {
  const input = control(id);
  if (input instanceof HTMLInputElement) {
    return input;
  }
  throw new InvariantError(`the ${id} control is not an input`);
}

describe('DisplayPage', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('for a signed-in user', () => {
    it('reflects the stored preferences and writes changes through', async () => {
      const context = await createSignedInContext();
      const updatePreferences = vi
        .spyOn(context.stores.auth, 'updatePreferences')
        .mockResolvedValue(undefined);
      renderWithContext(DisplayPage, { props: {}, context });

      const language = selectControl('language');
      expect(language.value).toBe('en');
      expect(language.options.length).toBeGreaterThan(1);

      const format = selectControl('birthday-format');
      expect(format.value).toBe('eu');

      const hints = inputControl('shortcut-hints');
      expect(hints.type).toBe('checkbox');
      expect(hints.checked).toBe(false);

      await fireEvent.change(format, { target: { value: 'long' } });
      await tick();
      expect(updatePreferences).toHaveBeenCalledWith({ birthdayFormat: 'long' });
      await waitFor(() =>
        expect(screen.getByRole('status').textContent?.trim().length).toBeGreaterThan(0),
      );

      await fireEvent.click(hints);
      await tick();
      expect(updatePreferences).toHaveBeenCalledWith({ showShortcutHints: true });

      const country = selectControl('default-country');
      expect(country.value).toBe('DE');
      await fireEvent.change(country, { target: { value: 'AT' } });
      await tick();
      expect(updatePreferences).toHaveBeenCalledWith({ defaultCountry: 'AT' });
      await fireEvent.change(country, { target: { value: '' } });
      await tick();
      expect(updatePreferences).toHaveBeenCalledWith({ defaultCountry: null });
    });
  });
});
