<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { isSearchOpen, search } from '$lib/stores/search';
import ContactAvatar from './contacts/ContactAvatar.svelte';

let inputElement: HTMLInputElement | undefined;
let containerElement: HTMLDivElement | undefined;

// Get store values reactively
let state = $derived($search);

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
      handleSelect();
      break;
  }
}

// Handle selecting a result or recent search
function handleSelect() {
  if (state.query.trim().length < 2) {
    // Selecting from recent searches
    if (state.recentSearches.length > 0 && state.selectedIndex < state.recentSearches.length) {
      const selectedQuery = state.recentSearches[state.selectedIndex];
      search.setQuery(selectedQuery);
    }
    return;
  }

  // Selecting from search results
  if (state.results.length > 0 && state.selectedIndex < state.results.length) {
    const contact = state.results[state.selectedIndex];
    navigateToContact(contact.id);
  }
}

// Navigate to contact and close search
async function navigateToContact(contactId: string) {
  // Save to recent searches
  if (state.query.trim().length >= 2) {
    search.addRecentSearch(state.query.trim());
  }
  search.close();
  await goto(`/contacts/${contactId}`);
}

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
let showResults = $derived(state.query.trim().length >= 2);
let showRecentSearches = $derived(state.query.trim().length < 2 && state.recentSearches.length > 0);
let showEmptyState = $derived(
  state.query.trim().length >= 2 && !state.isSearching && state.results.length === 0,
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
    aria-label="Search contacts"
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
          value={state.query}
          oninput={(e) => search.setQuery(e.currentTarget.value)}
          placeholder="Search contacts..."
          class="w-full pl-12 pr-4 py-4 text-lg font-body text-gray-900 placeholder-gray-400 focus:outline-none"
          autocomplete="off"
          role="combobox"
          aria-expanded={showResults || showRecentSearches}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {#if state.isSearching}
          <div class="absolute right-4 top-1/2 -translate-y-1/2">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-forest border-t-transparent"></div>
          </div>
        {/if}
      </div>

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
            <ul role="listbox">
              {#each state.recentSearches as recentQuery, index}
                <li
                  role="option"
                  aria-selected={state.selectedIndex === index}
                  class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer {state.selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}"
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
          <ul role="listbox" class="p-2">
            {#each state.results as contact, index}
              <li
                role="option"
                aria-selected={state.selectedIndex === index}
              >
                <button
                  type="button"
                  onclick={() => navigateToContact(contact.id)}
                  class="w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-colors {state.selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}"
                >
                  <ContactAvatar
                    displayName={contact.displayName}
                    photoUrl={contact.photoThumbnailUrl}
                    size="sm"
                  />
                  <div class="flex-1 min-w-0 text-left">
                    <div class="font-body text-sm font-medium text-gray-900">
                      {contact.displayName}
                    </div>
                    {#if contact.organization || contact.jobTitle}
                      <div class="font-body text-xs text-gray-500 truncate">
                        {#if contact.jobTitle && contact.organization}
                          {contact.jobTitle} at {contact.organization}
                        {:else if contact.jobTitle}
                          {contact.jobTitle}
                        {:else if contact.organization}
                          {contact.organization}
                        {/if}
                      </div>
                    {/if}
                    {#if contact.primaryEmail || contact.primaryPhone}
                      <div class="font-body text-xs text-gray-400 truncate">
                        {contact.primaryEmail || contact.primaryPhone}
                      </div>
                    {/if}
                    {#if contact.headline && contact.matchSource}
                      <div class="mt-1 font-body text-xs text-gray-500 line-clamp-2">
                        <!-- Using @html for highlighted content from ts_headline -->
                        {@html contact.headline}
                      </div>
                    {/if}
                  </div>
                  {#if contact.matchSource && contact.matchSource !== 'contact'}
                    <span class="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full {
                      contact.matchSource === 'email' ? 'bg-blue-100 text-blue-700' :
                      contact.matchSource === 'phone' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }">
                      {contact.matchSource}
                    </span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {:else if showEmptyState}
          <!-- No results -->
          <div class="p-8 text-center">
            <svg class="mx-auto w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mt-2 font-body text-sm text-gray-500">
              No contacts found for "{state.query}"
            </p>
            <p class="mt-1 font-body text-xs text-gray-400">
              Try a different search term
            </p>
          </div>
        {:else if state.query.trim().length < 2 && state.recentSearches.length === 0}
          <!-- Initial state with no recent searches -->
          <div class="p-8 text-center">
            <svg class="mx-auto w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p class="mt-2 font-body text-sm text-gray-500">
              Search for contacts by name, email, phone, or notes
            </p>
            <p class="mt-1 font-body text-xs text-gray-400">
              Type at least 2 characters to search
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer with keyboard hints -->
      <div class="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
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
