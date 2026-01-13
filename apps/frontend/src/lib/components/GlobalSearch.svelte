<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import {
  hasActiveFilters,
  isFacetsLoading,
  isSearchOpen,
  search,
  searchFacets,
} from '$lib/stores/search';
import type { ArrayFacetField, FacetFilters } from '$shared';
import FriendAvatar from './friends/FriendAvatar.svelte';
import FacetChips from './search/FacetChips.svelte';
import FacetDropdown from './search/FacetDropdown.svelte';

let inputElement = $state<HTMLInputElement | undefined>(undefined);
let containerElement = $state<HTMLDivElement | undefined>(undefined);

// Get store values reactively
let searchState = $derived($search);
let facets = $derived($searchFacets);
let facetsLoading = $derived($isFacetsLoading);
let showFilters = $derived($hasActiveFilters);

// Focus input when modal opens
$effect(() => {
  if ($isSearchOpen && inputElement) {
    requestAnimationFrame(() => {
      inputElement?.focus();
    });
    // Load recent searches when opening
    search.loadRecentSearches();
  }
});

// Handle click outside to close
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    search.close();
  }
}

// Handle keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (!$isSearchOpen) return;

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      search.close();
      break;
    case 'ArrowDown':
      e.preventDefault();
      search.selectNext();
      break;
    case 'ArrowUp':
      e.preventDefault();
      search.selectPrevious();
      break;
    case 'Enter':
      e.preventDefault();
      if (e.altKey) {
        // Alt/Option+Enter: Create new friend
        navigateToNewFriend();
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl+Enter: Navigate to friends list with search
        navigateToFriendsList();
      } else {
        handleSelect();
      }
      break;
  }
}

// Handle selecting a result or recent search
function handleSelect() {
  if (searchState.query.trim().length < 2) {
    // Selecting from recent searches
    if (
      searchState.recentSearches.length > 0 &&
      searchState.selectedIndex < searchState.recentSearches.length
    ) {
      const selectedQuery = searchState.recentSearches[searchState.selectedIndex];
      search.setQuery(selectedQuery);
    }
    return;
  }

  // Selecting from search results
  if (searchState.results.length > 0 && searchState.selectedIndex < searchState.results.length) {
    const friend = searchState.results[searchState.selectedIndex];
    navigateToFriend(friend.id);
  }
}

// Navigate to friend and close search
async function navigateToFriend(friendId: string) {
  // Save to recent searches
  if (searchState.query.trim().length >= 2) {
    search.addRecentSearch(searchState.query.trim());
  }
  search.close();
  await goto(`/friends/${friendId}`);
}

// Navigate to friends list with search query
async function navigateToFriendsList() {
  if (searchState.query.trim().length >= 2) {
    search.addRecentSearch(searchState.query.trim());
  }
  search.close();
  await goto(
    searchState.query.trim().length >= 2
      ? `/friends?q=${encodeURIComponent(searchState.query.trim())}`
      : '/friends',
  );
}

// Navigate to create new friend
async function navigateToNewFriend() {
  search.close();
  await goto('/friends/new');
}

// Detect platform for keyboard shortcut hint
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Handle clicking on a recent search
function handleRecentSearchClick(query: string) {
  search.setQuery(query);
}

// Handle deleting a recent search
function handleDeleteRecentSearch(e: MouseEvent, query: string) {
  e.stopPropagation();
  search.deleteRecentSearch(query);
}

// Determine what to show in the list
let showResults = $derived(searchState.query.trim().length >= 2 && searchState.results.length > 0);
let showRecentSearches = $derived(
  searchState.query.trim().length < 2 && searchState.recentSearches.length > 0,
);
let showEmptyState = $derived(
  searchState.query.trim().length >= 2 &&
    !searchState.isSearching &&
    searchState.results.length === 0,
);

onMount(() => {
  // Add global keydown listener for Escape
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && $isSearchOpen) {
      search.close();
    }
  };
  window.addEventListener('keydown', handleGlobalKeydown);
  return () => window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

{#if $isSearchOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[10vh]"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label="Search friends"
    tabindex="-1"
  >
    <!-- Modal container -->
    <div
      bind:this={containerElement}
      class="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden"
    >
      <!-- Search input -->
      <div class="relative border-b border-gray-200">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
          value={searchState.query}
          oninput={(e) => search.setQuery(e.currentTarget.value, { loadFacets: true })}
          placeholder="Search friends..."
          class="w-full pl-12 pr-4 py-4 text-lg font-body text-gray-900 placeholder-gray-400 focus:outline-none"
          autocomplete="off"
          role="combobox"
          aria-expanded={showResults || showRecentSearches}
          aria-controls="global-search-listbox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {#if searchState.isSearching}
          <div class="absolute right-4 top-1/2 -translate-y-1/2">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-forest border-t-transparent"></div>
          </div>
        {/if}
      </div>

      <!-- Facet filters bar (shown when query has results or filters are active) -->
      {#if (showResults || showFilters) && searchState.query.trim().length >= 2}
        <div class="border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-2">
          <FacetDropdown
            facets={facets}
            activeFilters={searchState.filters}
            onFilterChange={(filters: FacetFilters) => search.setFilters(filters)}
            isLoading={facetsLoading}
          />
          <FacetChips
            filters={searchState.filters}
            onRemove={(field: ArrayFacetField, value: string) => search.removeFilter(field, value)}
            onClearAll={() => search.clearFilters()}
          />
        </div>
      {/if}

      <!-- Results area -->
      <div class="max-h-[60vh] overflow-y-auto">
        {#if showRecentSearches}
          <!-- Recent searches -->
          <div class="p-2">
            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Searches</span>
              <button
                type="button"
                onclick={() => search.clearRecentSearches()}
                class="text-xs text-gray-400 hover:text-gray-600 font-normal normal-case"
              >
                Clear all
              </button>
            </div>
            <ul id="global-search-listbox" role="listbox">
              {#each searchState.recentSearches as recentQuery, index}
                <li
                  role="option"
                  aria-selected={searchState.selectedIndex === index}
                  class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer {searchState.selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}"
                  onclick={() => handleRecentSearchClick(recentQuery)}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRecentSearchClick(recentQuery); }}}
                  tabindex="0"
                >
                  <div class="flex items-center gap-3">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-body text-sm text-gray-700">{recentQuery}</span>
                  </div>
                  <button
                    type="button"
                    onclick={(e) => handleDeleteRecentSearch(e, recentQuery)}
                    class="p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label="Remove from recent searches"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {:else if showResults}
          <!-- Search results -->
          <ul id="global-search-listbox" role="listbox" class="p-2">
            {#each searchState.results as friend, index}
              <li
                role="option"
                aria-selected={searchState.selectedIndex === index}
              >
                <button
                  type="button"
                  onclick={() => navigateToFriend(friend.id)}
                  class="w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-colors {searchState.selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}"
                >
                  <FriendAvatar
                    displayName={friend.displayName}
                    photoUrl={friend.photoThumbnailUrl}
                    size="sm"
                  />
                  <div class="flex-1 min-w-0 text-left">
                    <div class="font-body text-sm font-medium text-gray-900">
                      {friend.displayName}
                    </div>
                    {#if friend.organization || friend.jobTitle}
                      <div class="font-body text-xs text-gray-500 truncate">
                        {#if friend.jobTitle && friend.organization}
                          {friend.jobTitle} at {friend.organization}
                        {:else if friend.jobTitle}
                          {friend.jobTitle}
                        {:else if friend.organization}
                          {friend.organization}
                        {/if}
                      </div>
                    {/if}
                    {#if friend.primaryEmail || friend.primaryPhone}
                      <div class="font-body text-xs text-gray-400 truncate">
                        {friend.primaryEmail || friend.primaryPhone}
                      </div>
                    {/if}
                    {#if friend.headline && friend.matchSource}
                      <div class="mt-1 font-body text-xs text-gray-500 line-clamp-2">
                        <!-- Using @html for highlighted content from ts_headline -->
                        {@html friend.headline}
                      </div>
                    {/if}
                  </div>
                  {#if friend.matchSource && friend.matchSource !== 'friend'}
                    <span class="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full {
                      friend.matchSource === 'email' ? 'bg-blue-100 text-blue-700' :
                      friend.matchSource === 'phone' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }">
                      {friend.matchSource}
                    </span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {:else if showEmptyState}
          <!-- No results -->
          <div class="p-6 text-center">
            <svg class="mx-auto w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mt-3 font-body text-sm text-gray-600">
              Hmm, no one matches "{searchState.query}"
            </p>
            <p class="mt-1 font-body text-xs text-gray-400">
              Try different keywords or add them to your Freundebuch
            </p>
            <button
              type="button"
              onclick={navigateToNewFriend}
              class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg font-body text-sm font-medium hover:bg-forest-light transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add new friend
            </button>
          </div>
        {:else if searchState.query.trim().length < 2 && searchState.recentSearches.length === 0}
          <!-- Initial state with no recent searches -->
          <div class="p-8 text-center">
            <svg class="mx-auto w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p class="mt-2 font-body text-sm text-gray-500">
              Find friends by name, email, phone, or notes
            </p>
            <p class="mt-1 font-body text-xs text-gray-400">
              Type at least 2 characters to search
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer: Mobile action buttons -->
      <div class="sm:hidden border-t border-gray-200 p-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onclick={() => search.close()}
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-body text-sm transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
        <button
          type="button"
          onclick={navigateToNewFriend}
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-forest hover:bg-gray-100 rounded-lg font-body text-sm font-medium transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
        <button
          type="button"
          onclick={navigateToFriendsList}
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-forest hover:bg-gray-100 rounded-lg font-body text-sm font-medium transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Friends
        </button>
      </div>

      <!-- Footer: Desktop keyboard hints -->
      <div class="hidden sm:flex border-t border-gray-200 px-4 py-2 items-center justify-between text-xs text-gray-400">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">↑</kbd>
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">↓</kbd>
            <span>Navigate</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">↵</kbd>
            <span>Select</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">Esc</kbd>
            <span>Close</span>
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={navigateToNewFriend}
            class="flex items-center gap-1.5 text-gray-500 hover:text-forest font-body transition-colors"
          >
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">
              {isMac ? '⌥' : 'Alt'}↵
            </kbd>
            <span>New friend</span>
          </button>
          <button
            type="button"
            onclick={navigateToFriendsList}
            class="flex items-center gap-1.5 text-gray-500 hover:text-forest font-body transition-colors"
          >
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">
              {isMac ? '⌘' : 'Ctrl'}↵
            </kbd>
            <span>Friends list</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Style for highlighted search terms from ts_headline */
  :global(mark) {
    background-color: rgb(254 249 195); /* yellow-100 */
    color: rgb(17 24 39); /* gray-900 */
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
