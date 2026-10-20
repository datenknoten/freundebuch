import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import type { GlobalSearchResultResponse } from '$shared';
import { FriendSearchApi } from '../api/friend-search.js';
import { SearchStore } from './search.js';

const friendSearchApi = new FriendSearchApi({ client: createTestApiClient() });

function createSearchStore() {
  return new SearchStore({ friendSearchApi, logger: createRootLogger({ LOG_LEVEL: 'silent' }) });
}

function aHit(id: string) {
  const hit: GlobalSearchResultResponse = {
    id,
    displayName: id,
    rank: 1,
    headline: null,
    matchSource: null,
    circles: [],
  };
  return hit;
}

const ONE_PAGE = { page: 1, pageSize: 10, totalCount: 1, totalPages: 1 };

describe('SearchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('opening and closing', () => {
    it('toggles between open and closed', () => {
      const search = createSearchStore();

      search.toggle();
      expect(get(search.isOpen)).toBe(true);
      search.toggle();
      expect(get(search.isOpen)).toBe(false);
    });

    // The focus has to move inside the same call as open(): on iOS a focus()
    // that runs after the tap handler returns never raises the keyboard.
    it('focuses the attached input on open and blurs it on close', () => {
      const search = createSearchStore();
      const input = document.createElement('input');
      document.body.appendChild(input);
      search.attachInput(input);

      search.open();
      expect(document.activeElement).toBe(input);
      search.close();
      expect(document.activeElement).not.toBe(input);

      search.detachInput(input);
      search.open();
      expect(document.activeElement).not.toBe(input);
      input.remove();
    });
  });

  describe('setQuery', () => {
    it('runs a full-text search after the typing pause when no filter is set', async () => {
      const fullTextSearch = vi
        .spyOn(friendSearchApi, 'fullTextSearch')
        .mockResolvedValue([aHit('f-1')]);
      const search = createSearchStore();

      search.setQuery('ada');
      expect(get(search).isSearching).toBe(true);
      await vi.advanceTimersByTimeAsync(300);

      expect(fullTextSearch).toHaveBeenCalledWith('ada', 10);
      expect(get(search).results).toEqual([aHit('f-1')]);
      expect(get(search).isSearching).toBe(false);
    });

    it('does not search for a query shorter than two characters', async () => {
      const fullTextSearch = vi.spyOn(friendSearchApi, 'fullTextSearch');
      const search = createSearchStore();

      search.setQuery('a');
      await vi.advanceTimersByTimeAsync(300);

      expect(fullTextSearch).not.toHaveBeenCalled();
    });

    it('runs the faceted search while a filter is set', async () => {
      const facetedSearch = vi
        .spyOn(friendSearchApi, 'facetedSearch')
        .mockResolvedValue({ data: [aHit('f-2')], pagination: ONE_PAGE });
      const search = createSearchStore();
      search.setFilters({ city: ['Berlin'] });

      search.setQuery('ada');
      await vi.advanceTimersByTimeAsync(300);

      expect(facetedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'ada', filters: { city: ['Berlin'] } }),
      );
      expect(get(search).results).toEqual([aHit('f-2')]);
    });

    it('records a failure as an error message', async () => {
      vi.spyOn(friendSearchApi, 'fullTextSearch').mockRejectedValue(new TypeError('offline'));
      const search = createSearchStore();

      search.setQuery('ada');
      await vi.advanceTimersByTimeAsync(300);

      expect(get(search).error).toBe('Search failed');
    });
  });

  describe('selection', () => {
    it('stays between the first and the last result', async () => {
      vi.spyOn(friendSearchApi, 'fullTextSearch').mockResolvedValue([aHit('a'), aHit('b')]);
      const search = createSearchStore();
      search.setQuery('ada');
      await vi.advanceTimersByTimeAsync(300);

      search.selectPrevious();
      expect(get(search).selectedIndex).toBe(0);
      search.selectNext();
      search.selectNext();
      search.selectNext();
      expect(get(search).selectedIndex).toBe(1);
    });
  });

  describe('recent searches', () => {
    it('loads the recent searches', async () => {
      vi.spyOn(friendSearchApi, 'listRecentSearches').mockResolvedValue(['ada', 'bob']);
      const search = createSearchStore();

      await search.loadRecentSearches();

      expect(get(search).recentSearches).toEqual(['ada', 'bob']);
    });

    it('moves a repeated query to the top without duplicating it', async () => {
      vi.spyOn(friendSearchApi, 'listRecentSearches').mockResolvedValue(['bob', 'Ada']);
      vi.spyOn(friendSearchApi, 'addRecentSearch').mockResolvedValue(undefined);
      const search = createSearchStore();
      await search.loadRecentSearches();

      await search.addRecentSearch('ada');

      expect(get(search).recentSearches).toEqual(['ada', 'bob']);
    });

    it('keeps the list when deleting fails', async () => {
      vi.spyOn(friendSearchApi, 'listRecentSearches').mockResolvedValue(['ada']);
      vi.spyOn(friendSearchApi, 'deleteRecentSearch').mockRejectedValue(new TypeError('offline'));
      const search = createSearchStore();
      await search.loadRecentSearches();

      await search.deleteRecentSearch('ada');

      expect(get(search).recentSearches).toEqual(['ada']);
    });
  });

  describe('filters', () => {
    it('drops a facet once its last value is removed', () => {
      const search = createSearchStore();
      search.setFilters({ city: ['Berlin'] });

      search.removeFilter('city', 'Berlin');

      expect(get(search.hasActiveFilters)).toBe(false);
    });
  });
});
