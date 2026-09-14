import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import FavoriteButton from './favorite-button.svelte';

// i18n echoes keys so the assertions target stable label keys, not English.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

describe('FavoriteButton', () => {
  it('labels itself for adding when not a favorite', () => {
    render(FavoriteButton, { isFavorite: false });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('aria.addToFavorites');
  });

  it('labels itself for removing when already a favorite', () => {
    render(FavoriteButton, { isFavorite: true });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('aria.removeFromFavorites');
  });

  it('calls onclick when pressed', async () => {
    const onclick = vi.fn();
    render(FavoriteButton, { isFavorite: false, onclick });

    await fireEvent.click(screen.getByRole('button'));

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('renders the button as disabled when disabled', () => {
    render(FavoriteButton, { isFavorite: false, onclick: vi.fn(), disabled: true });

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
