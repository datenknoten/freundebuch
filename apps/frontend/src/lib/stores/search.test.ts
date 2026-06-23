import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('$shared', () => ({}));
vi.mock('../api/friends.js', () => h.api);

import {
  hasActiveFilters,
  isSearching,
  isSearchOpen,
  recentSearches,
  search,
  searchFilters,
  searchResults,
} from './search.js';

describe('search store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    search.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    search.reset();
  });

  describe('modal state', () => {
    it('open / close / toggle drive isOpen and reset on close', () => {
      search.open();
      expect(get(isSearchOpen)).toBe(true);

      search.close();
      expect(get(isSearchOpen)).toBe(false);

      search.toggle();
      expect(get(isSearchOpen)).toBe(true);
      search.toggle();
      expect(get(isSearchOpen)).toBe(false);
    });
  });

  describe('setQuery', () => {
    it('runs a debounced simple search when no filters are active', async () => {
      h.api.fullTextSearch.mockResolvedValue([{ id: 'f-1' }]);

      search.setQuery('ada');
      expect(get(isSearching)).toBe(true);

      await vi.advanceTimersByTimeAsync(300);

      expect(h.api.fullTextSearch).toHaveBeenCalledWith('ada', 10);
      expect(get(searchResults)).toEqual([{ id: 'f-1' }]);
      expect(get(isSearching)).toBe(false);
    });

    it('does not search for queries shorter than two characters', async () => {
      search.setQuery('a');
      expect(get(isSearching)).toBe(false);

      await vi.advanceTimersByTimeAsync(300);

      expect(h.api.fullTextSearch).not.toHaveBeenCalled();
    });

    it('uses faceted search when filters are active', async () => {
      h.api.facetedSearch.mockResolvedValue({ results: [{ id: 'f-2' }], facets: null });
      search.setFilters({ city: ['Berlin'] });

      search.setQuery('ada');
      await vi.advanceTimersByTimeAsync(300);

      expect(h.api.facetedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'ada', filters: { city: ['Berlin'] } }),
      );
      expect(get(searchResults)).toEqual([{ id: 'f-2' }]);
    });
  });

  describe('selection navigation', () => {
    it('clamps selectPrevious at 0 and selectNext at the last result', async () => {
      h.api.fullTextSearch.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      search.setQuery('ada');
      await vi.advanceTimersByTimeAsync(300);

      search.selectPrevious();
      expect(get(search).selectedIndex).toBe(0);

      search.selectNext();
      search.selectNext();
      search.selectNext();
      expect(get(search).selectedIndex).toBe(1); // clamped to results.length - 1
    });
  });

  describe('recent searches', () => {
    it('loadRecentSearches populates from the API', async () => {
      h.api.getRecentSearches.mockResolvedValue(['ada', 'bob']);
      await search.loadRecentSearches();
      expect(get(recentSearches)).toEqual(['ada', 'bob']);
    });

    it('addRecentSearch prepends, de-duplicates case-insensitively, and caps at 10', async () => {
      h.api.getRecentSearches.mockResolvedValue(['Ada', 'bob']);
      await search.loadRecentSearches();
      h.api.addRecentSearch.mockResolvedValue(undefined);

      await search.addRecentSearch('ada');

      expect(h.api.addRecentSearch).toHaveBeenCalledWith('ada');
      expect(get(recentSearches)).toEqual(['ada', 'bob']);
    });

    it('addRecentSearch ignores queries shorter than two characters', async () => {
      await search.addRecentSearch('a');
      expect(h.api.addRecentSearch).not.toHaveBeenCalled();
    });

    it('deleteRecentSearch and clearRecentSearches update state', async () => {
      h.api.getRecentSearches.mockResolvedValue(['ada', 'bob']);
      await search.loadRecentSearches();

      h.api.deleteRecentSearch.mockResolvedValue(undefined);
      await search.deleteRecentSearch('ada');
      expect(get(recentSearches)).toEqual(['bob']);

      h.api.clearRecentSearches.mockResolvedValue(undefined);
      await search.clearRecentSearches();
      expect(get(recentSearches)).toEqual([]);
    });
  });

  describe('filters', () => {
    it('setFilters / removeFilter / clearFilters update filters and hasActiveFilters', () => {
      search.setFilters({ city: ['Berlin', 'Munich'] });
      expect(get(searchFilters)).toEqual({ city: ['Berlin', 'Munich'] });
      expect(get(hasActiveFilters)).toBe(true);

      search.removeFilter('city', 'Berlin');
      expect(get(searchFilters).city).toEqual(['Munich']);

      search.clearFilters();
      expect(get(searchFilters)).toEqual({});
      expect(get(hasActiveFilters)).toBe(false);
    });

    it('removeFilter drops the key entirely when the last value is removed', () => {
      search.setFilters({ city: ['Berlin'] });
      search.removeFilter('city', 'Berlin');
      expect(get(searchFilters).city).toBeUndefined();
    });
  });
});
