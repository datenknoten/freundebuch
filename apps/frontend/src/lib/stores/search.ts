import { derived, writable } from 'svelte/store';
import type { ArrayFacetField, FacetFilters, FacetGroups, GlobalSearchResult } from '$shared';
import * as friendsApi from '../api/friends.js';

/**
 * Search state interface
 */
interface SearchState {
  query: string;
  results: GlobalSearchResult[];
  recentSearches: string[];
  isSearching: boolean;
  isOpen: boolean;
  error: string | null;
  selectedIndex: number;
  // Faceted search state
  filters: FacetFilters;
  facets: FacetGroups | null;
  facetsLoading: boolean;
}

/**
 * Initial search state
 */
const initialState: SearchState = {
  query: '',
  results: [],
  recentSearches: [],
  isSearching: false,
  isOpen: false,
  error: null,
  selectedIndex: 0,
  // Faceted search state
  filters: {},
  facets: null,
  facetsLoading: false,
};

/**
 * Debounce helper
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Create the search store
 */
function createSearchStore() {
  const { subscribe, set, update } = writable<SearchState>(initialState);

  // Debounced search function (for simple search without filters)
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      update((state) => ({ ...state, results: [], isSearching: false }));
      return;
    }

    try {
      const results = await friendsApi.fullTextSearch(query, 10);
      update((state) => ({
        ...state,
        results,
        isSearching: false,
        selectedIndex: 0,
      }));
    } catch {
      update((state) => ({
        ...state,
        results: [],
        isSearching: false,
        error: 'Search failed',
      }));
    }
  }, 300);

  // Debounced faceted search function
  const debouncedFacetedSearch = debounce(async (query: string, filters: FacetFilters) => {
    if (!query.trim() || query.trim().length < 2) {
      update((state) => ({ ...state, results: [], isSearching: false }));
      return;
    }

    try {
      // Check if any filters are active
      const hasFilters = Object.values(filters).some((arr) => arr && arr.length > 0);

      if (hasFilters) {
        // Use faceted search when filters are active
        const response = await friendsApi.facetedSearch({
          query,
          filters,
          includeFacets: true,
          pageSize: 10,
        });
        update((state) => ({
          ...state,
          results: response.results,
          facets: response.facets ?? null,
          isSearching: false,
          facetsLoading: false,
          selectedIndex: 0,
        }));
      } else {
        // Use simple search when no filters (faster)
        const results = await friendsApi.fullTextSearch(query, 10);
        update((state) => ({
          ...state,
          results,
          isSearching: false,
          selectedIndex: 0,
        }));
      }
    } catch {
      update((state) => ({
        ...state,
        results: [],
        isSearching: false,
        facetsLoading: false,
        error: 'Search failed',
      }));
    }
  }, 300);

  // Load facets for the current query (called separately for progressive loading)
  const loadFacets = debounce(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      return;
    }

    update((state) => ({ ...state, facetsLoading: true }));

    try {
      const response = await friendsApi.facetedSearch({
        query,
        includeFacets: true,
        pageSize: 1, // Minimal results, we just want facets
      });
      update((state) => ({
        ...state,
        facets: response.facets ?? null,
        facetsLoading: false,
      }));
    } catch {
      update((state) => ({
        ...state,
        facetsLoading: false,
      }));
    }
  }, 500);

  return {
    subscribe,

    /**
     * Open the search modal
     */
    open: () => {
      update((state) => ({ ...state, isOpen: true }));
    },

    /**
     * Close the search modal and reset state
     */
    close: () => {
      update((state) => ({
        ...state,
        isOpen: false,
        query: '',
        results: [],
        selectedIndex: 0,
        error: null,
        filters: {},
        facets: null,
        facetsLoading: false,
      }));
    },

    /**
     * Toggle the search modal
     */
    toggle: () => {
      update((state) => {
        if (state.isOpen) {
          return {
            ...state,
            isOpen: false,
            query: '',
            results: [],
            selectedIndex: 0,
            error: null,
            filters: {},
            facets: null,
            facetsLoading: false,
          };
        }
        return { ...state, isOpen: true };
      });
    },

    /**
     * Set the search query and trigger search
     * Optionally loads facets for progressive enhancement
     */
    setQuery: (query: string, options?: { loadFacets?: boolean }) => {
      let currentFilters: FacetFilters = {};

      update((state) => {
        currentFilters = state.filters;
        return {
          ...state,
          query,
          isSearching: query.trim().length >= 2,
          error: null,
        };
      });

      // Check if filters are active
      const hasFilters = Object.values(currentFilters).some((arr) => arr && arr.length > 0);

      if (hasFilters) {
        // Use faceted search when filters are active
        debouncedFacetedSearch(query, currentFilters);
      } else {
        // Use simple search (faster)
        debouncedSearch(query);
      }

      // Optionally load facets in background
      if (options?.loadFacets && query.trim().length >= 2) {
        loadFacets(query);
      }
    },

    /**
     * Navigate selection up
     */
    selectPrevious: () => {
      update((state) => ({
        ...state,
        selectedIndex: Math.max(0, state.selectedIndex - 1),
      }));
    },

    /**
     * Navigate selection down
     */
    selectNext: () => {
      update((state) => ({
        ...state,
        selectedIndex: Math.min(
          state.results.length > 0 ? state.results.length - 1 : state.recentSearches.length - 1,
          state.selectedIndex + 1,
        ),
      }));
    },

    /**
     * Reset selection index
     */
    resetSelection: () => {
      update((state) => ({ ...state, selectedIndex: 0 }));
    },

    /**
     * Load recent searches from API
     */
    loadRecentSearches: async () => {
      try {
        const recentSearches = await friendsApi.getRecentSearches(10);
        update((state) => ({ ...state, recentSearches }));
      } catch (error) {
        // Silently fail - recent searches are not critical
        console.error('Failed to load recent searches:', error);
      }
    },

    /**
     * Add a search to recent searches
     */
    addRecentSearch: async (query: string) => {
      if (!query.trim() || query.trim().length < 2) return;

      try {
        await friendsApi.addRecentSearch(query.trim());
        // Optimistically update local state
        update((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== query.toLowerCase(),
          );
          return {
            ...state,
            recentSearches: [query, ...filtered].slice(0, 10),
          };
        });
      } catch (error) {
        console.error('Failed to save recent search:', error);
      }
    },

    /**
     * Delete a specific recent search
     */
    deleteRecentSearch: async (query: string) => {
      try {
        await friendsApi.deleteRecentSearch(query);
        update((state) => ({
          ...state,
          recentSearches: state.recentSearches.filter((s) => s !== query),
        }));
      } catch (error) {
        console.error('Failed to delete recent search:', error);
      }
    },

    /**
     * Clear all recent searches
     */
    clearRecentSearches: async () => {
      try {
        await friendsApi.clearRecentSearches();
        update((state) => ({ ...state, recentSearches: [] }));
      } catch (error) {
        console.error('Failed to clear recent searches:', error);
      }
    },

    /**
     * Set facet filters and trigger new search
     */
    setFilters: (filters: FacetFilters) => {
      let currentQuery = '';

      update((state) => {
        currentQuery = state.query;
        return { ...state, filters, isSearching: true };
      });

      // Re-run the search with new filters
      if (currentQuery.trim().length >= 2) {
        debouncedFacetedSearch(currentQuery, filters);
      }
    },

    /**
     * Remove a single filter value (array-type facet fields only)
     */
    removeFilter: (field: ArrayFacetField, value: string) => {
      let currentQuery = '';
      let newFilters: FacetFilters = {};

      update((state) => {
        currentQuery = state.query;
        const current = state.filters[field] ?? [];
        const updated = current.filter((v) => v !== value);
        newFilters = {
          ...state.filters,
          [field]: updated.length > 0 ? updated : undefined,
        };
        return { ...state, filters: newFilters, isSearching: true };
      });

      // Re-run the search with updated filters
      if (currentQuery.trim().length >= 2) {
        debouncedFacetedSearch(currentQuery, newFilters);
      }
    },

    /**
     * Clear all filters
     */
    clearFilters: () => {
      let currentQuery = '';

      update((state) => {
        currentQuery = state.query;
        return { ...state, filters: {}, isSearching: true };
      });

      // Re-run the search without filters
      if (currentQuery.trim().length >= 2) {
        debouncedFacetedSearch(currentQuery, {});
      }
    },

    /**
     * Reset the store to initial state
     */
    reset: () => set(initialState),
  };
}

export const search = createSearchStore();

// Derived stores for convenience
export const isSearchOpen = derived(search, ($search) => $search.isOpen);
export const searchResults = derived(search, ($search) => $search.results);
export const isSearching = derived(search, ($search) => $search.isSearching);
export const searchQuery = derived(search, ($search) => $search.query);
export const recentSearches = derived(search, ($search) => $search.recentSearches);

// Faceted search derived stores
export const searchFilters = derived(search, ($search) => $search.filters);
export const searchFacets = derived(search, ($search) => $search.facets);
export const isFacetsLoading = derived(search, ($search) => $search.facetsLoading);
export const hasActiveFilters = derived(search, ($search) =>
  Object.values($search.filters).some((arr) => arr && arr.length > 0),
);
