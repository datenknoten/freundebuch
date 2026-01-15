<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';
import * as friendsApi from '$lib/api/friends';
import { auth, birthdayFormat, friendsPageSize, friendsTableColumns } from '$lib/stores/auth';
import { friendList, friendListFilter, friends, isFriendsLoading } from '$lib/stores/friends';
import { filterModeCategory, isFilterModeActive, visibleFriendIds } from '$lib/stores/ui';
import {
  type ArrayFacetField,
  type ColumnId,
  DEFAULT_COLUMNS,
  type FacetFilters,
  type FacetGroups,
  type FriendGridItem,
  type GlobalSearchResult,
  type PageSize,
  type SearchSortBy,
  searchResultToFriendGridItem,
  toFriendGridItem,
} from '$shared';
import FacetChips from '../search/FacetChips.svelte';
// biome-ignore lint/style/useImportType: FacetDropdown is used both as type and value (bind:this)
import FacetDropdown from '../search/FacetDropdown.svelte';
import ColumnChooser from './ColumnChooser.svelte';
import FriendGrid from './FriendGrid.svelte';

// Reference to FacetDropdown for keyboard filter control
let facetDropdownRef = $state<FacetDropdown | null>(null);

interface Props {
  initialQuery?: string;
  initialFilters?: FacetFilters;
  onQueryChange?: (query: string) => void;
  onFiltersChange?: (filters: FacetFilters) => void;
}

let { initialQuery = '', initialFilters = {}, onQueryChange, onFiltersChange }: Props = $props();

// List mode state
let sortBy = $state<'display_name' | 'created_at' | 'updated_at'>('display_name');
let sortOrder = $state<'asc' | 'desc'>('asc');

// Search mode state
let searchQuery = $state((() => initialQuery)());
let searchResults = $state<GlobalSearchResult[]>([]);
let searchTotal = $state(0);
let searchPage = $state(1);
let searchTotalPages = $state(0);
let searchSortBy = $state<SearchSortBy>('relevance');
let searchSortOrder = $state<'asc' | 'desc'>('desc');
let isSearching = $state(false);
let searchError = $state<string | null>(null);
let inputElement = $state<HTMLInputElement | null>(null);

// Facet state
let activeFilters = $state<FacetFilters>((() => ({ ...initialFilters }))());
let facets = $state<FacetGroups | null>(null);
let isFacetsLoading = $state(false);

// Derived state
let isSearchMode = $derived(searchQuery.trim().length >= 2);
let hasActiveFilters = $derived(Object.values(activeFilters).some((arr) => arr && arr.length > 0));
let isFilterMode = $derived(hasActiveFilters && !isSearchMode);
let showNoResults = $derived(
  (isSearchMode || isFilterMode) && !isSearching && searchResults.length === 0,
);
let currentPageSize = $derived($friendsPageSize);

// Return URL for navigation back from friend detail (preserves search/filter state)
let returnUrl = $derived($page.url.pathname + $page.url.search);

// Persist filter state to store for restoration when navigating back
$effect(() => {
  friendListFilter.setState(searchQuery, activeFilters);
});

// Columns - use user preferences or defaults
let currentColumns = $derived<ColumnId[]>(
  ($friendsTableColumns as ColumnId[] | null) ?? [...DEFAULT_COLUMNS],
);

function handleColumnsChange(newColumns: ColumnId[]) {
  auth.updatePreferences({ friendsTableColumns: newColumns });
}

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Perform search with debounce
function handleSearchInput(value: string) {
  searchQuery = value;
  searchError = null;
  searchPage = 1; // Reset to first page on new search

  // Notify parent of query change
  onQueryChange?.(value);

  // Clear any pending debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  const hasQuery = value.trim().length >= 2;

  // If no query and no active filters, clear results
  if (!hasQuery && !hasActiveFilters) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    isSearching = false;
    return;
  }

  isSearching = true;

  debounceTimer = setTimeout(async () => {
    await performSearch();
  }, 300);
}

async function performSearch() {
  const hasQuery = searchQuery.trim().length >= 2;

  // Need either a query or active filters
  if (!hasQuery && !hasActiveFilters) return;

  isSearching = true;
  try {
    const result = await friendsApi.facetedSearch({
      query: hasQuery ? searchQuery.trim() : undefined,
      page: searchPage,
      pageSize: currentPageSize,
      sortBy: hasQuery ? searchSortBy : sortBy,
      sortOrder: hasQuery ? searchSortOrder : sortOrder,
      filters: activeFilters,
      includeFacets: true,
    });
    searchResults = result.results;
    searchTotal = result.total;
    searchTotalPages = result.totalPages;
    facets = result.facets ?? null;
  } catch (error) {
    console.error('Search failed:', error);
    searchError = 'Search failed. Please try again.';
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    facets = null;
  } finally {
    isSearching = false;
  }
}

function clearSearch() {
  searchQuery = '';
  searchResults = [];
  searchTotal = 0;
  searchPage = 1;
  searchTotalPages = 0;
  isSearching = false;
  searchError = null;
  searchSortBy = 'relevance';
  searchSortOrder = 'desc';
  activeFilters = {};
  onQueryChange?.('');
  inputElement?.focus();
}

// Filter handlers
function handleFilterChange(newFilters: FacetFilters) {
  activeFilters = newFilters;
  searchPage = 1;
  onFiltersChange?.(newFilters);
  performSearch();
}

function handleRemoveFilter(field: ArrayFacetField, value: string) {
  const current = (activeFilters[field] ?? []) as string[];
  const updated = current.filter((v) => v !== value);
  const newFilters = {
    ...activeFilters,
    [field]: updated.length > 0 ? updated : undefined,
  };
  activeFilters = newFilters;
  searchPage = 1;
  onFiltersChange?.(newFilters);

  // If no more filters and no search query, just reload the facets
  if (!hasActiveFilters && !isSearchMode) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    loadFacets();
  } else {
    performSearch();
  }
}

function handleClearAllFilters() {
  activeFilters = {};
  searchPage = 1;
  onFiltersChange?.({});

  // If no search query, clear results and just reload facets
  if (!isSearchMode) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    loadFacets();
  } else {
    performSearch();
  }
}

// Load facets without search query (for initial state)
async function loadFacets() {
  isFacetsLoading = true;
  try {
    const result = await friendsApi.facetedSearch({
      pageSize: 1,
      includeFacets: true,
    });
    facets = result.facets ?? null;
  } catch (error) {
    console.error('Failed to load facets:', error);
  } finally {
    isFacetsLoading = false;
  }
}

async function loadPage(page: number) {
  if (isSearchMode || isFilterMode) {
    searchPage = page;
    await performSearch();
  } else {
    await friends.loadFriends({
      page,
      pageSize: currentPageSize,
      sortBy,
      sortOrder,
    });
  }
}

async function handleSortChange() {
  if (isSearchMode) {
    searchPage = 1;
    await performSearch();
  } else {
    await loadPage(1);
  }
}

function toggleSortOrder() {
  if (isSearchMode) {
    searchSortOrder = searchSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  }
  handleSortChange();
}

// Handle sort changes from table header clicks
function handleTableSortChange(
  newSortBy: 'display_name' | 'created_at' | 'updated_at',
  newSortOrder: 'asc' | 'desc',
) {
  sortBy = newSortBy;
  sortOrder = newSortOrder;
  handleSortChange();
}

async function handlePageSizeChange(newSize: PageSize) {
  // Update user preferences (optimistic update with retry)
  auth.updatePreferences({ friendsPageSize: newSize });

  // Reload with new page size, reset to page 1
  if (isSearchMode) {
    searchPage = 1;
    await performSearch();
  } else {
    await friends.loadFriends({
      page: 1,
      pageSize: newSize,
      sortBy,
      sortOrder,
    });
  }
}

// Navigate to previous page (for keyboard shortcut)
export function goToPreviousPage() {
  const currentPage = isSearchMode ? searchPage : $friends.page;
  if (currentPage > 1) {
    loadPage(currentPage - 1);
  }
}

// Navigate to next page (for keyboard shortcut)
export function goToNextPage() {
  const totalPages = isSearchMode ? searchTotalPages : $friends.totalPages;
  const currentPage = isSearchMode ? searchPage : $friends.page;
  if (currentPage < totalPages) {
    loadPage(currentPage + 1);
  }
}

// Initialize search if there's an initial query or filters
$effect(() => {
  const hasInitialFilters = Object.values(initialFilters).some((arr) => arr && arr.length > 0);
  if (initialQuery && initialQuery.trim().length >= 2) {
    handleSearchInput(initialQuery);
  } else if (hasInitialFilters) {
    // Filters without query - trigger filter-only search
    performSearch();
  }
});

// Load facets on mount (when auth is initialized)
$effect(() => {
  if ($auth.isInitialized && !facets) {
    loadFacets();
  }
});

// Update visible friend IDs for keyboard navigation
$effect(() => {
  if (!isSearchMode && !isFilterMode) {
    const ids = $friendList.map((c) => c.id);
    visibleFriendIds.set(ids);
  } else if (searchResults.length > 0) {
    const ids = searchResults.map((r) => r.id);
    visibleFriendIds.set(ids);
  } else {
    visibleFriendIds.set([]);
  }
});

// Listen for keyboard filter shortcuts
onMount(() => {
  function handleFilterToggle(e: Event) {
    const event = e as CustomEvent<{ category: string; index: number }>;
    facetDropdownRef?.toggleFilterByIndex(event.detail.index);
  }

  function handleClearFilters() {
    handleClearAllFilters();
    // Reset filter mode state
    isFilterModeActive.set(false);
    filterModeCategory.set(null);
  }

  window.addEventListener('shortcut:filter-toggle', handleFilterToggle);
  window.addEventListener('shortcut:clear-filters', handleClearFilters);

  return () => {
    window.removeEventListener('shortcut:filter-toggle', handleFilterToggle);
    window.removeEventListener('shortcut:clear-filters', handleClearFilters);
  };
});

// Computed values for display
let displayTotal = $derived(isSearchMode || isFilterMode ? searchTotal : $friends.total);
let displayPage = $derived(isSearchMode || isFilterMode ? searchPage : $friends.page);
let displayTotalPages = $derived(
  isSearchMode || isFilterMode ? searchTotalPages : $friends.totalPages,
);
let currentSortBy = $derived(isSearchMode ? searchSortBy : sortBy);
let currentSortOrder = $derived(isSearchMode ? searchSortOrder : sortOrder);

// Convert items to unified FriendGridItem format
let gridItems = $derived.by<FriendGridItem[]>(() => {
  if (isSearchMode || isFilterMode) {
    return searchResults.map(searchResultToFriendGridItem);
  } else {
    return $friendList.map(toFriendGridItem);
  }
});
</script>

<div class="space-y-4">
  <!-- Search input (prominent) -->
  <div class="relative">
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <input
      bind:this={inputElement}
      type="text"
      value={searchQuery}
      oninput={(e) => handleSearchInput(e.currentTarget.value)}
      placeholder="Search friends by name, email, phone, or notes..."
      class="w-full pl-12 pr-12 py-3 text-base font-body text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent"
      autocomplete="off"
      data-search-input
      aria-label="Search friends"
    />
    {#if isSearching}
      <div class="absolute right-4 top-1/2 -translate-y-1/2" aria-live="polite">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-forest border-t-transparent" role="status">
          <span class="sr-only">Searching...</span>
        </div>
      </div>
    {:else if searchQuery}
      <button
        type="button"
        onclick={clearSearch}
        class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        aria-label="Clear search"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  {#if searchError}
    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-body" role="alert">
      {searchError}
    </div>
  {/if}

  <!-- Facet filters bar (always visible) -->
  <div class="flex flex-wrap items-center gap-2 py-2">
    <FacetDropdown
      bind:this={facetDropdownRef}
      {facets}
      {activeFilters}
      onFilterChange={handleFilterChange}
      isLoading={isFacetsLoading}
    />
    <FacetChips
      filters={activeFilters}
      onRemove={handleRemoveFilter}
      onClearAll={handleClearAllFilters}
    />
  </div>

  <!-- Unified Control Bar -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-gray-200">
    <!-- Left: Result count -->
    <div class="text-sm text-gray-600 font-body" aria-live="polite">
      {#if isSearchMode}
        {displayTotal} result{displayTotal !== 1 ? 's' : ''} for "{searchQuery}"
        {#if hasActiveFilters}
          <span class="text-forest">(filtered)</span>
        {/if}
      {:else if isFilterMode}
        {displayTotal} friend{displayTotal !== 1 ? 's' : ''} <span class="text-forest">(filtered)</span>
      {:else}
        {displayTotal} friend{displayTotal !== 1 ? 's' : ''}
      {/if}
    </div>

    <!-- Right: Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Column chooser (desktop only) -->
      <div class="hidden md:block">
        <ColumnChooser columns={currentColumns} onColumnsChange={handleColumnsChange} />
      </div>

      <!-- Page size selector -->
      <div class="flex items-center gap-2">
        <label for="page-size" class="text-sm text-gray-600 font-body whitespace-nowrap">Show:</label>
        <select
          id="page-size"
          value={currentPageSize}
          onchange={(e) => handlePageSizeChange(Number(e.currentTarget.value) as PageSize)}
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
          aria-label="Items per page"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <!-- Sort controls -->
      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm text-gray-600 font-body whitespace-nowrap">Sort:</label>
        <select
          id="sort-by"
          value={currentSortBy}
          onchange={(e) => {
            if (isSearchMode) {
              searchSortBy = e.currentTarget.value as SearchSortBy;
            } else {
              sortBy = e.currentTarget.value as 'display_name' | 'created_at' | 'updated_at';
            }
            handleSortChange();
          }}
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
          aria-label="Sort by"
        >
          {#if isSearchMode}
            <option value="relevance">Relevance</option>
          {/if}
          <option value="display_name">Name</option>
          <option value="created_at">Date Added</option>
          <option value="updated_at">Last Updated</option>
        </select>

        <button
          onclick={toggleSortOrder}
          class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          title={currentSortOrder === 'asc' ? 'Ascending order' : 'Descending order'}
          aria-label={currentSortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {#if currentSortOrder === 'asc'}
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          {:else}
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
          {/if}
        </button>
      </div>

      <!-- Pagination controls (inline) -->
      {#if displayTotalPages > 1}
        <div class="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
          <button
            onclick={() => loadPage(displayPage - 1)}
            disabled={displayPage <= 1}
            class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page (Shift+,)"
            aria-label="Previous page"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-sm text-gray-600 font-body px-2 whitespace-nowrap">
            {displayPage} / {displayTotalPages}
          </span>
          <button
            onclick={() => loadPage(displayPage + 1)}
            disabled={displayPage >= displayTotalPages}
            class="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page (Shift+.)"
            aria-label="Next page"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Content area -->
  {#if (isSearchMode || isFilterMode) && isSearching && searchResults.length === 0}
    <div class="flex justify-center py-12" aria-live="polite">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest" role="status">
        <span class="sr-only">Loading results...</span>
      </div>
    </div>
  {:else if (isSearchMode || isFilterMode) && showNoResults}
    <!-- No results -->
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-4 text-lg font-heading text-gray-900">No friends found</h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        {#if isSearchMode}
          No results for "{searchQuery}"{#if hasActiveFilters} with current filters{/if}
        {:else}
          No friends match the current filters
        {/if}
      </p>
      <p class="mt-1 text-xs text-gray-400 font-body">
        {#if isSearchMode}
          Try a different search term or check your spelling
        {:else}
          Try adjusting or clearing the filters
        {/if}
      </p>
      {#if hasActiveFilters}
        <button
          onclick={handleClearAllFilters}
          class="mt-4 inline-flex items-center gap-2 text-forest hover:text-forest-light font-body font-medium transition-colors"
        >
          Clear filters
        </button>
      {/if}
      {#if isSearchMode}
        <button
          onclick={clearSearch}
          class="mt-4 ml-4 inline-flex items-center gap-2 text-forest hover:text-forest-light font-body font-medium transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear search
        </button>
      {/if}
    </div>
  {:else if !isSearchMode && !isFilterMode && $isFriendsLoading}
    <div class="flex justify-center py-12" aria-live="polite">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest" role="status">
        <span class="sr-only">Loading friends...</span>
      </div>
    </div>
  {:else if !isSearchMode && !isFilterMode && $friendList.length === 0}
    <!-- Empty state -->
    <div class="text-center py-12 bg-gray-50 rounded-lg">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h3 class="mt-4 text-lg font-heading text-gray-900">No friends yet</h3>
      <p class="mt-2 text-sm text-gray-600 font-body">
        Get started by adding your first friend.
      </p>
      <a
        href="/friends/new"
        class="mt-4 inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Friend
      </a>
    </div>
  {:else if gridItems.length > 0}
    <!-- Unified Friend Grid - same component for both normal and search modes -->
    <FriendGrid
      items={gridItems}
      columns={currentColumns}
      sortBy={currentSortBy}
      sortOrder={currentSortOrder}
      birthdayFormat={$birthdayFormat}
      isSearchMode={isSearchMode}
      {returnUrl}
      onSortChange={handleTableSortChange}
    />
  {/if}
</div>
