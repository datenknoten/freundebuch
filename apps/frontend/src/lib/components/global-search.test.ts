import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '$lib/test';
import GlobalSearch from './global-search.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/index.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const h = vi.hoisted(() => ({
  api: {
    fullTextSearch: vi.fn(),
    facetedSearch: vi.fn(),
    getRecentSearches: vi.fn(),
    addRecentSearch: vi.fn(),
    deleteRecentSearch: vi.fn(),
    clearRecentSearches: vi.fn(),
  },
}));
vi.mock('$lib/api/friends.js', () => h.api);

// The real store drives the component, so open/close go through it.
import { search } from '$lib/stores/search';

beforeEach(() => {
  h.api.getRecentSearches.mockResolvedValue(['Dori', 'Merl']);
  h.api.deleteRecentSearch.mockResolvedValue(undefined);
  h.api.clearRecentSearches.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  search.reset();
  vi.clearAllMocks();
});

describe('GlobalSearch', () => {
  // The input must exist before the modal opens (see the store's open()), so
  // the closed modal is hidden rather than unmounted.
  it('keeps the input mounted but hidden while the search store is closed', async () => {
    render(GlobalSearch);

    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.className).toContain('pointer-events-none');
    const input = screen.getByPlaceholderText('globalSearch.placeholder');
    expect(input.getAttribute('tabindex')).toBe('-1');
    expect(screen.queryByText('globalSearch.recentSearches')).toBeNull();

    search.open();
    await waitFor(() => {
      expect(dialog.getAttribute('aria-hidden')).toBe('false');
    });
    expect(dialog.className).not.toContain('pointer-events-none');
    expect(input.getAttribute('tabindex')).toBeNull();
  });

  // iOS shows the keyboard only for a focus() inside the user's tap, so the
  // focus has to happen synchronously in open() — not on mount, not a frame
  // later.
  it('focuses the input synchronously when the modal opens', () => {
    render(GlobalSearch);
    const input = screen.getByPlaceholderText('globalSearch.placeholder');

    search.open();

    expect(document.activeElement).toBe(input);
  });

  it('blurs the input when the modal closes so the keyboard goes away', () => {
    render(GlobalSearch);
    const input = screen.getByPlaceholderText('globalSearch.placeholder');
    search.open();
    expect(document.activeElement).toBe(input);

    search.close();

    expect(document.activeElement).not.toBe(input);
  });

  it('loads and lists the recent searches on open', async () => {
    render(GlobalSearch);
    search.open();

    await waitFor(() => {
      expect(h.api.getRecentSearches).toHaveBeenCalled();
    });
    expect(await screen.findByText('Dori')).toBeTruthy();
    expect(screen.getByText('Merl')).toBeTruthy();
  });

  it('puts a clicked recent search into the input', async () => {
    render(GlobalSearch);
    search.open();

    const recent = await screen.findByText('Dori');
    await fireEvent.click(recent);

    const input = screen.getByPlaceholderText<HTMLInputElement>('globalSearch.placeholder');
    await waitFor(() => {
      expect(input.value).toBe('Dori');
    });
  });

  it('drops a recent search without leaving the modal', async () => {
    render(GlobalSearch);
    search.open();

    await screen.findByText('Dori');
    const [removeDori] = screen.getAllByLabelText('aria.removeRecentSearch');
    await fireEvent.click(removeDori);

    await waitFor(() => {
      expect(h.api.deleteRecentSearch).toHaveBeenCalledWith('Dori');
    });
    expect(screen.getByPlaceholderText('globalSearch.placeholder')).toBeTruthy();
  });
});
