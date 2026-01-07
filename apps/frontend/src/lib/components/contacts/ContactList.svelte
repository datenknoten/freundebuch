<script lang="ts">
import * as contactsApi from '$lib/api/contacts';
import { contactList, contacts, isContactsLoading } from '$lib/stores/contacts';
import type { GlobalSearchResult } from '$shared';
import ContactListItem from './ContactListItem.svelte';
import SearchResultItem from './SearchResultItem.svelte';

interface Props {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

let { initialQuery = '', onQueryChange }: Props = $props();

let sortBy = $state<'display_name' | 'created_at' | 'updated_at'>('display_name');
let sortOrder = $state<'asc' | 'desc'>('asc');

// Search state
let searchQuery = $state(initialQuery);
let searchResults = $state<GlobalSearchResult[]>([]);
let isSearching = $state(false);
let searchError = $state<string | null>(null);
let inputElement = $state<HTMLInputElement | null>(null);

// Derived state
let isSearchMode = $derived(searchQuery.trim().length >= 2);
let showNoResults = $derived(isSearchMode && !isSearching && searchResults.length === 0);

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Perform search with debounce
function handleSearchInput(value: string) {
  searchQuery = value;
  searchError = null;

  // Notify parent of query change
  onQueryChange?.(value);

  // Clear any pending debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (value.trim().length < 2) {
    searchResults = [];
    isSearching = false;
    return;
  }

  isSearching = true;

  debounceTimer = setTimeout(async () => {
    try {
      const results = await contactsApi.fullTextSearch(value.trim(), 50);
      searchResults = results;
    } catch (error) {
      console.error('Search failed:', error);
      searchError = 'Search failed. Please try again.';
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }, 300);
}

function clearSearch() {
  searchQuery = '';
  searchResults = [];
  isSearching = false;
  searchError = null;
  onQueryChange?.('');
  inputElement?.focus();
}

async function loadPage(page: number) {
  await contacts.loadContacts({
    page,
    pageSize: $contacts.pageSize,
    sortBy,
    sortOrder,
  });
}

async function handleSortChange() {
  await loadPage(1);
}

function toggleSortOrder() {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  handleSortChange();
}

// Initialize search if there's an initial query
$effect(() => {
  if (initialQuery && initialQuery.trim().length >= 2) {
    handleSearchInput(initialQuery);
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
    />
    {#if isSearching}
      <div class="absolute right-4 top-1/2 -translate-y-1/2">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-forest border-t-transparent"></div>
      </div>
    {:else if searchQuery}
      <button
        type="button"
        onclick={clearSearch}
        class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        aria-label="Clear search"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  {#if searchError}
    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-body">
      {searchError}
    </div>
  {/if}

  {#if isSearchMode}
    <!-- Search mode: show search results -->
    {#if isSearching}
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
      </div>
    {:else if showNoResults}
      <!-- No search results -->
      <div class="text-center py-12 bg-gray-50 rounded-lg">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="mt-4 text-lg font-heading text-gray-900">No friends found</h3>
        <p class="mt-2 text-sm text-gray-600 font-body">
          No results for "{searchQuery}"
        </p>
        <p class="mt-1 text-xs text-gray-400 font-body">
          Try a different search term or check your spelling
        </p>
        <button
          onclick={clearSearch}
          class="mt-4 inline-flex items-center gap-2 text-forest hover:text-forest-light font-body font-medium transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear search
        </button>
      </div>
    {:else}
      <!-- Search results list -->
      <div class="text-sm text-gray-600 font-body">
        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
      </div>
      <div class="space-y-2">
        {#each searchResults as result (result.id)}
          <SearchResultItem {result} />
        {/each}
      </div>
    {/if}
  {:else}
    <!-- Normal mode: show paginated contact list -->
    <!-- Header with sorting controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="text-sm text-gray-600 font-body">
        {$contacts.total} contact{$contacts.total !== 1 ? 's' : ''}
      </div>

      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm text-gray-600 font-body">Sort by:</label>
        <select
          id="sort-by"
          bind:value={sortBy}
          onchange={handleSortChange}
          class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body focus:ring-2 focus:ring-forest focus:border-transparent"
        >
          <option value="display_name">Name</option>
          <option value="created_at">Date Added</option>
          <option value="updated_at">Last Updated</option>
        </select>

        <button
          onclick={toggleSortOrder}
          class="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {#if sortOrder === 'asc'}
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          {:else}
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <!-- Loading state -->
    {#if $isContactsLoading}
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
      </div>
    {:else if $contactList.length === 0}
      <!-- Empty state -->
      <div class="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 class="mt-4 text-lg font-heading text-gray-900">No contacts yet</h3>
        <p class="mt-2 text-sm text-gray-600 font-body">
          Get started by adding your first contact.
        </p>
        <a
          href="/contacts/new"
          class="mt-4 inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </a>
      </div>
    {:else}
      <!-- Contact list -->
      <div class="space-y-2">
        {#each $contactList as contact (contact.id)}
          <ContactListItem {contact} />
        {/each}
      </div>

      <!-- Pagination -->
      {#if $contacts.totalPages > 1}
        <div class="flex items-center justify-between pt-4 border-t border-gray-200">
          <div class="text-sm text-gray-600 font-body">
            Page {$contacts.page} of {$contacts.totalPages}
          </div>

          <div class="flex gap-2">
            <button
              onclick={() => loadPage($contacts.page - 1)}
              disabled={$contacts.page <= 1}
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onclick={() => loadPage($contacts.page + 1)}
              disabled={$contacts.page >= $contacts.totalPages}
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-body hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
