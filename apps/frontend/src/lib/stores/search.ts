import type { Logger } from 'pino';
import { derived, get, type Readable, writable } from 'svelte/store';
import type {
  ArrayFacetField,
  FacetFilters,
  FacetGroupsResponse,
  GlobalSearchResultResponse,
} from '$shared';
import type { FriendSearchApi } from '../api/friend-search.js';

export interface SearchStoreOptions {
  friendSearchApi: FriendSearchApi;
  logger: Logger;
}

export interface SearchState {
  query: string;
  results: GlobalSearchResultResponse[];
  recentSearches: string[];
  isSearching: boolean;
  isOpen: boolean;
  error: string | null;
  selectedIndex: number;
  filters: FacetFilters;
  facets: FacetGroupsResponse | null;
  isFacetsLoading: boolean;
}

const INITIAL_STATE: SearchState = {
  query: '',
  results: [],
  recentSearches: [],
  isSearching: false,
  isOpen: false,
  error: null,
  selectedIndex: 0,
  filters: {},
  facets: null,
  isFacetsLoading: false,
};

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 10;
const RECENT_SEARCH_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;
const FACETS_DEBOUNCE_MS = 500;

function isSearchable(query: string) {
  return query.trim().length >= MIN_QUERY_LENGTH;
}

function hasFilters(filters: FacetFilters) {
  return Object.values(filters).some(
    (values) => Array.isArray(values) === true && values.length > 0,
  );
}

function withoutFilterValue(filters: FacetFilters, field: ArrayFacetField, value: string) {
  const remaining = (filters[field] ?? []).filter((existing) => existing !== value);
  return { ...filters, [field]: remaining.length > 0 ? remaining : undefined };
}

function withRecentSearch(state: SearchState, query: string) {
  const others = state.recentSearches.filter(
    (recent) => recent.toLowerCase() !== query.toLowerCase(),
  );
  return { ...state, recentSearches: [query, ...others].slice(0, RECENT_SEARCH_LIMIT) };
}

function withoutRecentSearch(state: SearchState, query: string) {
  return { ...state, recentSearches: state.recentSearches.filter((recent) => recent !== query) };
}

function nextIndex(state: SearchState) {
  const count = state.results.length > 0 ? state.results.length : state.recentSearches.length;
  return Math.min(count - 1, state.selectedIndex + 1);
}

/** The global search modal: query, debounced results, facets and the user's recent searches. */
export class SearchStore {
  public readonly subscribe: Readable<SearchState>['subscribe'];
  public readonly isOpen: Readable<boolean>;
  public readonly facets: Readable<FacetGroupsResponse | null>;
  public readonly isFacetsLoading: Readable<boolean>;
  public readonly hasActiveFilters: Readable<boolean>;
  private readonly state = writable(INITIAL_STATE);
  private readonly friendSearchApi: FriendSearchApi;
  private readonly logger: Logger;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private facetsTimer: ReturnType<typeof setTimeout> | undefined;
  // The modal keeps its input mounted (hidden) while closed and registers it here, so `open`
  // can focus it synchronously: iOS raises the on-screen keyboard only for a focus() that
  // runs inside the user's tap.
  private inputElement: HTMLInputElement | undefined;

  public constructor(options: SearchStoreOptions) {
    this.friendSearchApi = options.friendSearchApi;
    this.logger = options.logger;
    this.subscribe = this.state.subscribe;
    this.isOpen = derived(this.state, (state) => state.isOpen);
    this.facets = derived(this.state, (state) => state.facets);
    this.isFacetsLoading = derived(this.state, (state) => state.isFacetsLoading);
    this.hasActiveFilters = derived(this.state, (state) => hasFilters(state.filters));
  }

  public attachInput(element: HTMLInputElement) {
    this.inputElement = element;
  }

  /** Call when the element is destroyed. */
  public detachInput(element: HTMLInputElement) {
    if (this.inputElement === element) {
      this.inputElement = undefined;
    }
  }

  public open() {
    this.state.update((state) => ({ ...state, isOpen: true }));
    this.inputElement?.focus();
  }

  /** Closes the modal and resets the query, results and filters. */
  public close() {
    // The input stays mounted, so only an explicit blur dismisses the mobile keyboard.
    this.inputElement?.blur();
    this.state.update((state) => ({
      ...state,
      isOpen: false,
      query: '',
      results: [],
      selectedIndex: 0,
      error: null,
      filters: {},
      facets: null,
      isFacetsLoading: false,
    }));
  }

  public toggle() {
    if (get(this.state).isOpen === true) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Searches after a pause in typing; `shouldLoadFacets` also refreshes the facets in the background. */
  public setQuery(query: string, options: { shouldLoadFacets?: boolean } = {}) {
    this.state.update((state) => ({
      ...state,
      query,
      isSearching: isSearchable(query),
      error: null,
    }));
    this.scheduleSearch(query, get(this.state).filters);
    if (options.shouldLoadFacets === true && isSearchable(query) === true) {
      this.scheduleFacets(query);
    }
  }

  public selectPrevious() {
    this.state.update((state) => ({
      ...state,
      selectedIndex: Math.max(0, state.selectedIndex - 1),
    }));
  }

  public selectNext() {
    this.state.update((state) => ({ ...state, selectedIndex: nextIndex(state) }));
  }

  /** Recent searches are a convenience: a failure is logged, never thrown. */
  public async loadRecentSearches() {
    try {
      const recentSearches = await this.friendSearchApi.listRecentSearches(RECENT_SEARCH_LIMIT);
      this.state.update((state) => ({ ...state, recentSearches }));
    } catch (err) {
      this.logger.error({ err }, 'Failed to load recent searches');
    }
  }

  public async addRecentSearch(query: string) {
    const trimmed = query.trim();
    if (isSearchable(trimmed) === false) {
      return;
    }
    try {
      await this.friendSearchApi.addRecentSearch(trimmed);
      this.state.update((state) => withRecentSearch(state, query));
    } catch (err) {
      this.logger.error({ err }, 'Failed to save recent search');
    }
  }

  public async deleteRecentSearch(query: string) {
    try {
      await this.friendSearchApi.deleteRecentSearch(query);
      this.state.update((state) => withoutRecentSearch(state, query));
    } catch (err) {
      this.logger.error({ err }, 'Failed to delete recent search');
    }
  }

  public async clearRecentSearches() {
    try {
      await this.friendSearchApi.clearRecentSearches();
      this.state.update((state) => ({ ...state, recentSearches: [] }));
    } catch (err) {
      this.logger.error({ err }, 'Failed to clear recent searches');
    }
  }

  public setFilters(filters: FacetFilters) {
    this.applyFilters(filters);
  }

  public removeFilter(field: ArrayFacetField, value: string) {
    this.applyFilters(withoutFilterValue(get(this.state).filters, field, value));
  }

  public clearFilters() {
    this.applyFilters({});
  }

  public reset() {
    clearTimeout(this.searchTimer);
    clearTimeout(this.facetsTimer);
    this.state.set(INITIAL_STATE);
  }

  private applyFilters(filters: FacetFilters) {
    this.state.update((state) => ({ ...state, filters, isSearching: true }));
    const { query } = get(this.state);
    if (isSearchable(query) === true) {
      this.scheduleSearch(query, filters);
    }
  }

  private scheduleSearch(query: string, filters: FacetFilters) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(query, filters), SEARCH_DEBOUNCE_MS);
  }

  private scheduleFacets(query: string) {
    clearTimeout(this.facetsTimer);
    this.facetsTimer = setTimeout(() => void this.loadFacets(query), FACETS_DEBOUNCE_MS);
  }

  /** Plain full-text search is faster, so the faceted endpoint only runs while filters are set. */
  private async search(query: string, filters: FacetFilters) {
    if (isSearchable(query) === false) {
      this.state.update((state) => ({ ...state, results: [], isSearching: false }));
      return;
    }
    try {
      if (hasFilters(filters) === true) {
        const response = await this.friendSearchApi.facetedSearch({
          query,
          filters,
          shouldIncludeFacets: true,
          pageSize: RESULT_LIMIT,
        });
        this.state.update((state) => ({
          ...state,
          results: response.data,
          facets: response.facets ?? null,
          isSearching: false,
          isFacetsLoading: false,
          selectedIndex: 0,
        }));
      } else {
        const results = await this.friendSearchApi.fullTextSearch(query, RESULT_LIMIT);
        this.state.update((state) => ({ ...state, results, isSearching: false, selectedIndex: 0 }));
      }
    } catch (err) {
      this.logger.warn({ err }, 'Search failed');
      this.state.update((state) => ({
        ...state,
        results: [],
        isSearching: false,
        isFacetsLoading: false,
        error: 'Search failed',
      }));
    }
  }

  private async loadFacets(query: string) {
    this.state.update((state) => ({ ...state, isFacetsLoading: true }));
    try {
      // One result is enough: only the facets are wanted.
      const response = await this.friendSearchApi.facetedSearch({
        query,
        shouldIncludeFacets: true,
        pageSize: 1,
      });
      this.state.update((state) => ({
        ...state,
        facets: response.facets ?? null,
        isFacetsLoading: false,
      }));
    } catch (err) {
      this.logger.warn({ err }, 'Failed to load search facets');
      this.state.update((state) => ({ ...state, isFacetsLoading: false }));
    }
  }
}
