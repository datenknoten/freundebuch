import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '$lib/test';
import FavoriteButton from './favorite-button.svelte';

describe('FavoriteButton', () => {
  it('labels itself for adding when not a favorite', () => {
    render(FavoriteButton, { isFavorite: false });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Add to favorites');
  });

  it('labels itself for removing when already a favorite', () => {
    render(FavoriteButton, { isFavorite: true });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Remove from favorites');
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
