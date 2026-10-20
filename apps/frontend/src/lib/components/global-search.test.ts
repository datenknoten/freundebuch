import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemAt } from '$lib/test/item-at.js';
import { cleanup, fireEvent, screen, waitFor } from '$lib/test/render.js';
import { renderWithContext } from '$lib/test/render-with-context.js';
import { createTestAppContext } from '$lib/test/test-app-context.js';
import GlobalSearch from './GlobalSearch.svelte';

// i18n returns the key so assertions can target stable label keys.
vi.mock('$lib/i18n/i18n.js', () => ({
  createI18n: () => ({
    subscribe: (run: (v: { t: (k: string) => string }) => void) => {
      run({ t: (k: string) => k });
      return () => undefined;
    },
  }),
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

/** The real search store drives the component, so open/close go through it. */
function renderGlobalSearch() {
  const context = createTestAppContext();
  const { friendSearch } = context.api;
  vi.spyOn(friendSearch, 'listRecentSearches').mockResolvedValue(['Dori', 'Merl']);
  const deleteRecentSearch = vi
    .spyOn(friendSearch, 'deleteRecentSearch')
    .mockResolvedValue(undefined);
  renderWithContext(GlobalSearch, { props: {}, context });
  return { search: context.stores.search, friendSearch, deleteRecentSearch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GlobalSearch', () => {
  // The input must exist before the modal opens (see the store's open()), so
  // the closed modal is hidden rather than unmounted.
  it('keeps the input mounted but hidden while the search store is closed', async () => {
    const { search } = renderGlobalSearch();

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
    const { search } = renderGlobalSearch();
    const input = screen.getByPlaceholderText('globalSearch.placeholder');

    search.open();

    expect(document.activeElement).toBe(input);
  });

  it('blurs the input when the modal closes so the keyboard goes away', () => {
    const { search } = renderGlobalSearch();
    const input = screen.getByPlaceholderText('globalSearch.placeholder');
    search.open();
    expect(document.activeElement).toBe(input);

    search.close();

    expect(document.activeElement).not.toBe(input);
  });

  it('loads and lists the recent searches on open', async () => {
    const { search, friendSearch } = renderGlobalSearch();
    search.open();

    await waitFor(() => {
      expect(friendSearch.listRecentSearches).toHaveBeenCalled();
    });
    expect(await screen.findByText('Dori')).toBeTruthy();
    expect(screen.getByText('Merl')).toBeTruthy();
  });

  it('puts a clicked recent search into the input', async () => {
    const { search } = renderGlobalSearch();
    search.open();

    const recent = await screen.findByText('Dori');
    await fireEvent.click(recent);

    const input = screen.getByPlaceholderText<HTMLInputElement>('globalSearch.placeholder');
    await waitFor(() => {
      expect(input.value).toBe('Dori');
    });
  });

  it('drops a recent search without leaving the modal', async () => {
    const { search, deleteRecentSearch } = renderGlobalSearch();
    search.open();

    await screen.findByText('Dori');
    const removeDori = itemAt(screen.getAllByLabelText('aria.removeRecentSearch'), 0);
    await fireEvent.click(removeDori);

    await waitFor(() => {
      expect(deleteRecentSearch).toHaveBeenCalledWith('Dori');
    });
    expect(screen.getByPlaceholderText('globalSearch.placeholder')).toBeTruthy();
  });
});
