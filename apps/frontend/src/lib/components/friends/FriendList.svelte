<script lang="ts">
import { onMount } from 'svelte';
import BarsArrowDown from 'svelte-heros-v2/BarsArrowDown.svelte';
import BarsArrowUp from 'svelte-heros-v2/BarsArrowUp.svelte';
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import ChevronRight from 'svelte-heros-v2/ChevronRight.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { getAppContext } from '$lib/app-context.js';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import SearchInput from '$lib/components/ui/SearchInput.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { createI18n } from '$lib/i18n/i18n.js';

const i18n = createI18n();

import ColumnChooser from '$lib/components/friends/ColumnChooser.svelte';
import FriendGrid from '$lib/components/friends/FriendGrid.svelte';
import FacetChips from '$lib/components/search/FacetChips.svelte';
import FacetDropdown from '$lib/components/search/FacetDropdown.svelte';
import {
  type ArrayFacetField,
  type ColumnId,
  DEFAULT_COLUMNS,
  type FacetFilters,
  type FacetGroupsResponse,
  type GlobalSearchResultResponse,
  type PageSize,
  type SearchSortBy,
  searchResultToFriendGridItem,
  toFriendGridItem,
} from '$shared';

const { api, logger, stores } = getAppContext();
const friends = stores.friends;
const friendList = friends.list;
const isFriendsLoading = friends.isLoading;
const friendListFilter = stores.friendListFilter;
const keyboardModes = stores.keyboardModes;
const filterModeCategory = keyboardModes.filter.category;
const isFilterModeActive = keyboardModes.filter.isActive;
const visibleFriendIds = keyboardModes.friends.visibleItems;

const auth = getAppContext().stores.auth;
const birthdayFormat = auth.birthdayFormat;
const friendsPageSize = auth.friendsPageSize;
const friendsTableColumns = auth.friendsTableColumns;

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
let searchResults = $state<GlobalSearchResultResponse[]>([]);
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
let facets = $state<FacetGroupsResponse | null>(null);
let isFacetsLoading = $state(false);

// Derived state
let isSearchMode = $derived(searchQuery.trim().length >= 2);
let hasActiveFilters = $derived(
  Object.values(activeFilters).some((arr) => arr !== undefined && arr.length > 0),
);
let isFilterMode = $derived(hasActiveFilters === true && isSearchMode === false);
let showNoResults = $derived(
  (isSearchMode === true || isFilterMode === true) &&
    isSearching === false &&
    searchResults.length === 0,
);
let currentPageSize = $derived($friendsPageSize);

// Return URL for navigation back from friend detail (preserves search/filter state)
let returnUrl = $derived($page.url.pathname + $page.url.search);

function persistFilterState() {
  friendListFilter.setState(searchQuery, activeFilters);
}

// Persist filter state to store for restoration when navigating back
$effect(persistFilterState);

// Columns - use user preferences or defaults
let currentColumns = $derived<ColumnId[]>(
  ($friendsTableColumns as ColumnId[] | null) ?? [...DEFAULT_COLUMNS],
);

function handleColumnsChange(newColumns: ColumnId[]) {
  void auth.updatePreferences({ friendsTableColumns: newColumns });
}

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Perform search with debounce
function handleSearchInput(value: string) {
  searchQuery = value;
  searchError = null;
  searchPage = 1; // Reset to first page on new search

  // Clear any pending debounce
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  const hasQuery = value.trim().length >= 2;

  // If no query and no active filters, clear results
  if (hasQuery === false && hasActiveFilters === false) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    isSearching = false;
    // Notify parent of query change (debounced to prevent pushState spam)
    onQueryChange?.(value);
    return;
  }

  isSearching = true;

  async function notifyAndSearch() {
    // Notify parent of query change (debounced to prevent pushState spam)
    onQueryChange?.(value);
    await performSearch();
  }

  debounceTimer = setTimeout(notifyAndSearch, 300);
}

async function performSearch() {
  const hasQuery = searchQuery.trim().length >= 2;

  // Need either a query or active filters
  if (hasQuery === false && hasActiveFilters === false) {
    return;
  }

  isSearching = true;
  try {
    const result = await api.friendSearch.facetedSearch({
      query: hasQuery === true ? searchQuery.trim() : undefined,
      page: searchPage,
      pageSize: currentPageSize,
      sortBy: hasQuery === true ? searchSortBy : sortBy,
      sortOrder: hasQuery === true ? searchSortOrder : sortOrder,
      filters: activeFilters,
      shouldIncludeFacets: true,
    });
    searchResults = result.data;
    searchTotal = result.pagination.totalCount;
    searchTotalPages = result.pagination.totalPages;
    facets = result.facets ?? null;
  } catch (error) {
    logger.warn({ err: error }, 'Friend list search failed');
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
  void performSearch();
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
  if (hasActiveFilters === false && isSearchMode === false) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    void loadFacets();
  } else {
    void performSearch();
  }
}

function handleClearAllFilters() {
  activeFilters = {};
  searchPage = 1;
  onFiltersChange?.({});

  // If no search query, clear results and just reload facets
  if (isSearchMode === false) {
    searchResults = [];
    searchTotal = 0;
    searchTotalPages = 0;
    void loadFacets();
  } else {
    void performSearch();
  }
}

// Load facets without search query (for initial state)
async function loadFacets() {
  isFacetsLoading = true;
  try {
    const result = await api.friendSearch.facetedSearch({
      pageSize: 1,
      shouldIncludeFacets: true,
    });
    facets = result.facets ?? null;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to load facets');
  } finally {
    isFacetsLoading = false;
  }
}

async function loadPage(page: number) {
  if (isSearchMode === true || isFilterMode === true) {
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
  if (isSearchMode === true) {
    searchPage = 1;
    await performSearch();
  } else {
    await loadPage(1);
  }
}

function toggleSortOrder() {
  if (isSearchMode === true) {
    searchSortOrder = searchSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  }
  void handleSortChange();
}

// Handle sort changes from table header clicks
function handleTableSortChange(
  newSortBy: 'display_name' | 'created_at' | 'updated_at',
  newSortOrder: 'asc' | 'desc',
) {
  sortBy = newSortBy;
  sortOrder = newSortOrder;
  void handleSortChange();
}

async function handlePageSizeChange(newSize: PageSize) {
  // Update user preferences (optimistic update with retry)
  void auth.updatePreferences({ friendsPageSize: newSize });

  // Reload with new page size, reset to page 1
  if (isSearchMode === true) {
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
  const currentPage = isSearchMode === true ? searchPage : $friends.page;
  if (currentPage > 1) {
    void loadPage(currentPage - 1);
  }
}

// Navigate to next page (for keyboard shortcut)
export function goToNextPage() {
  const totalPages = isSearchMode === true ? searchTotalPages : $friends.totalPages;
  const currentPage = isSearchMode === true ? searchPage : $friends.page;
  if (currentPage < totalPages) {
    void loadPage(currentPage + 1);
  }
}

function runInitialSearch() {
  const hasInitialFilters = Object.values(initialFilters).some(
    (arr) => arr !== undefined && arr.length > 0,
  );
  if (initialQuery.trim().length >= 2) {
    handleSearchInput(initialQuery);
  } else if (hasInitialFilters === true) {
    // Filters without query - trigger filter-only search
    void performSearch();
  }
}

// Initialize search if there's an initial query or filters
$effect(runInitialSearch);

function loadFacetsOnceAuthenticated() {
  if ($auth.isInitialized === true && facets === null) {
    void loadFacets();
  }
}

// Load facets on mount (when auth is initialized)
$effect(loadFacetsOnceAuthenticated);

function syncVisibleFriendIds() {
  if (isSearchMode === false && isFilterMode === false) {
    const ids = $friendList.map((c) => c.id);
    visibleFriendIds.set(ids);
  } else if (searchResults.length > 0) {
    const ids = searchResults.map((r) => r.id);
    visibleFriendIds.set(ids);
  } else {
    visibleFriendIds.set([]);
  }
}

// Update visible friend IDs for keyboard navigation
$effect(syncVisibleFriendIds);

function registerFilterShortcuts() {
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

  return function removeFilterShortcuts() {
    window.removeEventListener('shortcut:filter-toggle', handleFilterToggle);
    window.removeEventListener('shortcut:clear-filters', handleClearFilters);
  };
}

// Listen for keyboard filter shortcuts
onMount(registerFilterShortcuts);

// Computed values for display
let displayTotal = $derived(
  isSearchMode === true || isFilterMode === true ? searchTotal : $friends.total,
);
let displayPage = $derived(
  isSearchMode === true || isFilterMode === true ? searchPage : $friends.page,
);
let displayTotalPages = $derived(
  isSearchMode === true || isFilterMode === true ? searchTotalPages : $friends.totalPages,
);
let currentSortBy = $derived(isSearchMode === true ? searchSortBy : sortBy);
let currentSortOrder = $derived(isSearchMode === true ? searchSortOrder : sortOrder);

function buildGridItems() {
  if (isSearchMode === true || isFilterMode === true) {
    return searchResults.map(searchResultToFriendGridItem);
  }
  return $friendList.map(toFriendGridItem);
}

// Convert items to unified FriendGridItem format
let gridItems = $derived.by(buildGridItems);

// Open the first result when pressing Enter in the search box
function openFirstResult() {
  const first = gridItems[0];
  if (first === undefined) {
    return;
  }
  const url =
    returnUrl !== ''
      ? `/friends/${first.id}?from=${encodeURIComponent(returnUrl)}`
      : `/friends/${first.id}`;
  void goto(url);
}
</script>

<div class="space-y-4">
  <!-- Search input (prominent) -->
  <SearchInput
    bind:element={inputElement}
    value={searchQuery}
    oninput={handleSearchInput}
    onsubmit={openFirstResult}
    onclear={clearSearch}
    busy={isSearching}
    busyLabel={$i18n.t('common.searching')}
    placeholder={$i18n.t('friendList.searchPlaceholder')}
    ariaLabel={$i18n.t('aria.searchFriends')}
  />

  {#if searchError}
    <AlertBanner variant="error">{searchError}</AlertBanner>
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
        {$i18n.t('friendList.resultsFor', { count: displayTotal, query: searchQuery })}
        {#if hasActiveFilters}
          <span class="text-forest">{$i18n.t('friendList.filtered')}</span>
        {/if}
      {:else if isFilterMode}
        {$i18n.t('friendList.friendCount', { count: displayTotal })} <span class="text-forest">{$i18n.t('friendList.filtered')}</span>
      {:else}
        {$i18n.t('friendList.friendCount', { count: displayTotal })}
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
        <label for="page-size" class="text-sm text-gray-600 font-body whitespace-nowrap">{$i18n.t('friendList.show')}</label>
        <select
          id="page-size"
          value={currentPageSize}
          onchange={(e) => handlePageSizeChange(Number(e.currentTarget.value) as PageSize)}
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus-visible:ring-2 focus-visible:ring-forest focus-visible:border-forest"
          aria-label={$i18n.t('aria.itemsPerPage')}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <!-- Sort controls -->
      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm text-gray-600 font-body whitespace-nowrap">{$i18n.t('friendList.sortLabel')}</label>
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
          class="px-2 py-1 border border-gray-300 rounded text-sm font-body focus-visible:ring-2 focus-visible:ring-forest focus-visible:border-forest"
          aria-label={$i18n.t('aria.sortBy')}
        >
          {#if isSearchMode}
            <option value="relevance">{$i18n.t('friendList.relevance')}</option>
          {/if}
          <option value="display_name">{$i18n.t('friendList.name')}</option>
          <option value="created_at">{$i18n.t('friendList.dateAdded')}</option>
          <option value="updated_at">{$i18n.t('friendList.lastUpdated')}</option>
        </select>

        <Button
          variant="secondary"
          size="xs"
          onclick={toggleSortOrder}
          title={currentSortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
          aria-label={currentSortOrder === 'asc' ? $i18n.t('common.ascending') : $i18n.t('common.descending')}
        >
          {#if currentSortOrder === 'asc'}
            <BarsArrowUp class="w-4 h-4 text-gray-600" strokeWidth="2" />
          {:else}
            <BarsArrowDown class="w-4 h-4 text-gray-600" strokeWidth="2" />
          {/if}
        </Button>
      </div>

      <!-- Pagination controls (inline) -->
      {#if displayTotalPages > 1}
        <div class="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
          <Button
            variant="secondary"
            size="xs"
            onclick={() => loadPage(displayPage - 1)}
            disabled={displayPage <= 1}
            title={$i18n.t('aria.previousPage')}
            aria-label={$i18n.t('aria.previousPage')}
            data-shortcut="<"
            data-shortcut-label="shortcuts.help.previousPage"
          >
            <ChevronLeft class="w-4 h-4 text-gray-600" strokeWidth="2" />
          </Button>
          <span class="text-sm text-gray-600 font-body px-2 whitespace-nowrap">
            {displayPage} / {displayTotalPages}
          </span>
          <Button
            variant="secondary"
            size="xs"
            onclick={() => loadPage(displayPage + 1)}
            disabled={displayPage >= displayTotalPages}
            title={$i18n.t('aria.nextPage')}
            aria-label={$i18n.t('aria.nextPage')}
            data-shortcut=">"
            data-shortcut-label="shortcuts.help.nextPage"
          >
            <ChevronRight class="w-4 h-4 text-gray-600" strokeWidth="2" />
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Content area -->
  {#if (isSearchMode || isFilterMode) && isSearching && searchResults.length === 0}
    <div class="flex justify-center py-12">
      <Spinner size="lg" label={$i18n.t('common.loadingResults')} />
    </div>
  {:else if (isSearchMode || isFilterMode) && showNoResults}
    <EmptyState
      icon={FaceSmile}
      title={$i18n.t('friendList.noFriendsFound')}
      description={isSearchMode
        ? `${$i18n.t('friendList.noResultsFor', { query: searchQuery })}${hasActiveFilters ? ` ${$i18n.t('friendList.noResultsWithFilters')}` : ''}`
        : $i18n.t('friendList.noMatchFilters')}
      hint={isSearchMode
        ? $i18n.t('friendList.tryDifferentTerm')
        : $i18n.t('friendList.tryAdjustFilters')}
    >
      {#if hasActiveFilters}
        <Button variant="ghostAccent" size="sm" onclick={handleClearAllFilters}>
          {$i18n.t('friendList.clearFilters')}
        </Button>
      {/if}
      {#if isSearchMode}
        <Button variant="ghostAccent" size="sm" onclick={clearSearch}>
          <XMark class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('friendList.clearSearch')}
        </Button>
      {/if}
    </EmptyState>
  {:else if !isSearchMode && !isFilterMode && $isFriendsLoading}
    <div class="flex justify-center py-12">
      <Spinner size="lg" label={$i18n.t('common.loadingFriends')} />
    </div>
  {:else if !isSearchMode && !isFilterMode && $friendList.length === 0}
    <EmptyState
      icon={Users}
      title={$i18n.t('friendList.noFriendsYet')}
      description={$i18n.t('friendList.getStarted')}
    >
      <Button href="/friends/new">
        <Plus class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('friendList.addFriend')}
      </Button>
    </EmptyState>
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
