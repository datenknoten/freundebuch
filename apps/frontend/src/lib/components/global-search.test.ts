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
  it('stays unmounted while the search store is closed', () => {
    render(GlobalSearch);

    expect(screen.queryByPlaceholderText('globalSearch.placeholder')).toBeNull();
  });

  // Without focus on mount, mobile users get the modal but no keyboard — the
  // regression this component's autoFocus action guards against.
  it('focuses the input when the modal opens', async () => {
    render(GlobalSearch);
    search.open();

    const input = await screen.findByPlaceholderText('globalSearch.placeholder');
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
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
    const [removeDori] = screen.getAllByLabelText('Remove from recent searches');
    await fireEvent.click(removeDori);

    await waitFor(() => {
      expect(h.api.deleteRecentSearch).toHaveBeenCalledWith('Dori');
    });
    expect(screen.getByPlaceholderText('globalSearch.placeholder')).toBeTruthy();
  });
});
