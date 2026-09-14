import { readable } from 'svelte/store';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { control, fireEvent, render, tick, useLanguage } from '$lib/test';
import DisplayPage from './+page.svelte';

const updatePreferences = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/stores/auth', () => ({
  auth: {
    updatePreferences: (...args: unknown[]) => updatePreferences(...args),
  },
  currentUser: readable({ externalId: 'ext-1', email: 'ada@example.com' }),
  birthdayFormat: readable('eu'),
  showShortcutHints: readable(false),
}));

describe('profile display page', () => {
  beforeAll(async () => {
    await useLanguage('en');
  });

  it('reflects the stored preferences and writes changes through', async () => {
    render(DisplayPage, {});

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

    await fireEvent.click(hints);
    await tick();
    expect(updatePreferences).toHaveBeenCalledWith({ showShortcutHints: true });
  });
});
