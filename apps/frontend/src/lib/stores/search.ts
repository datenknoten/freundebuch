import { derived, writable } from 'svelte/store';
import type { GlobalSearchResult } from '$shared';
import * as contactsApi from '../api/contacts.js';

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

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      update((state) => ({ ...state, results: [], isSearching: false }));
      return;
    }

    try {
      const results = await contactsApi.fullTextSearch(query, 10);
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
          };
        }
        return { ...state, isOpen: true };
      });
    },

    /**
     * Set the search query and trigger search
     */
    setQuery: (query: string) => {
      update((state) => ({
        ...state,
        query,
        isSearching: query.trim().length >= 2,
        error: null,
      }));

      debouncedSearch(query);
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
        const recentSearches = await contactsApi.getRecentSearches(10);
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
        await contactsApi.addRecentSearch(query.trim());
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
        await contactsApi.deleteRecentSearch(query);
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
        await contactsApi.clearRecentSearches();
        update((state) => ({ ...state, recentSearches: [] }));
      } catch (error) {
        console.error('Failed to clear recent searches:', error);
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
