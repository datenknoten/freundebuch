<script lang="ts">
import DOMPurify from 'isomorphic-dompurify';
import { onMount } from 'svelte';
import Clock from 'svelte-heros-v2/Clock.svelte';
import FaceSmile from 'svelte-heros-v2/FaceSmile.svelte';
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { goto } from '$app/navigation';
import { focusTrap } from '$lib/actions/focus-trap.js';
import { getAppContext } from '$lib/app-context.js';
import FriendAvatar from '$lib/components/friends/FriendAvatar.svelte';
import FacetChips from '$lib/components/search/FacetChips.svelte';
import FacetDropdown from '$lib/components/search/FacetDropdown.svelte';
import Button from '$lib/components/ui/Button.svelte';
import { CODE_CLASSES } from '$lib/components/ui/code-classes.js';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import { findMatchSourceBadge } from '$lib/utils/match-source.js';
import type { ArrayFacetField, FacetFilters } from '$shared';

const i18n = createI18n();
const search = getAppContext().stores.search;
const isSearchOpen = search.isOpen;
const searchFacets = search.facets;
const isFacetsLoading = search.isFacetsLoading;
const hasActiveFilters = search.hasActiveFilters;

/** Sanitize search headline HTML to only allow <mark> tags for highlighting */
function sanitizeHeadline(html: string | null | undefined) {
  if (html === null || html === undefined || html === '') {
    return '';
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'] });
}

let searchState = $derived($search);
let facets = $derived($searchFacets);
let facetsLoading = $derived($isFacetsLoading);
let showFilters = $derived($hasActiveFilters);

// Load recent searches when the modal opens. Focus is not handled here: the
// store focuses the input itself, synchronously inside whatever opened it.
function loadRecentSearchesOnOpen() {
  if ($isSearchOpen === true) {
    void search.loadRecentSearches();
  }
}
$effect(loadRecentSearchesOnOpen);

// Hand the input to the store so open() can focus it inside the user's tap.
function registerInput(node: HTMLInputElement) {
  search.attachInput(node);
  return {
    destroy() {
      search.detachInput(node);
    },
  };
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    search.close();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if ($isSearchOpen === false) {
    return;
  }

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
      if (e.altKey === true) {
        // Alt/Option+Enter: Create new friend
        void navigateToNewFriend();
      } else if (e.metaKey === true || e.ctrlKey === true) {
        // Cmd/Ctrl+Enter: Navigate to friends list with search
        void navigateToFriendsList();
      } else {
        handleSelect();
      }
      break;
  }
}

function handleSelect() {
  if (searchState.query.trim().length < 2) {
    const selectedQuery = searchState.recentSearches[searchState.selectedIndex];
    if (selectedQuery !== undefined) {
      search.setQuery(selectedQuery);
    }
    return;
  }

  const friend = searchState.results[searchState.selectedIndex];
  if (friend !== undefined) {
    void navigateToFriend(friend.id);
  }
}

async function navigateToFriend(friendId: string) {
  if (searchState.query.trim().length >= 2) {
    void search.addRecentSearch(searchState.query.trim());
  }
  search.close();
  await goto(`/friends/${friendId}`);
}

async function navigateToFriendsList() {
  if (searchState.query.trim().length >= 2) {
    void search.addRecentSearch(searchState.query.trim());
  }
  search.close();
  await goto(
    searchState.query.trim().length >= 2
      ? `/friends?q=${encodeURIComponent(searchState.query.trim())}`
      : '/friends',
  );
}

async function navigateToNewFriend() {
  search.close();
  await goto('/friends/new');
}

// Detect platform for keyboard shortcut hint
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform) === true;

function handleRecentSearchClick(query: string) {
  search.setQuery(query);
}

function handleDeleteRecentSearch(e: MouseEvent, query: string) {
  e.stopPropagation();
  void search.deleteRecentSearch(query);
}

// Determine what to show in the list
let showResults = $derived(searchState.query.trim().length >= 2 && searchState.results.length > 0);
let showRecentSearches = $derived(
  searchState.query.trim().length < 2 && searchState.recentSearches.length > 0,
);
let showEmptyState = $derived(
  searchState.query.trim().length >= 2 &&
    searchState.isSearching === false &&
    searchState.results.length === 0,
);

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && $isSearchOpen === true) {
    search.close();
  }
}

function removeGlobalKeydown() {
  window.removeEventListener('keydown', handleGlobalKeydown);
}

function addGlobalKeydown() {
  window.addEventListener('keydown', handleGlobalKeydown);
  return removeGlobalKeydown;
}

onMount(addGlobalKeydown);
</script>

<!--
  The backdrop, card and input stay mounted while the modal is closed — only
  hidden, never display:none or visibility:hidden, which would make the input
  unfocusable. iOS shows the on-screen keyboard only for a focus() that runs
  inside the user's tap; the store focuses this input synchronously in open(),
  which is only possible because it already exists at that point.
-->
<div
  class="fixed inset-0 z-(--z-overlay) bg-gray-900/50 flex items-start justify-center pt-[10vh] {$isSearchOpen ? '' : 'opacity-0 pointer-events-none'}"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal={$isSearchOpen}
  aria-hidden={!$isSearchOpen}
  aria-label={$i18n.t('aria.searchFriends')}
  tabindex="-1"
>
  <!-- Modal container -->
  <div
    use:focusTrap={$isSearchOpen}
    class="w-full max-w-xl overflow-hidden {SURFACE_CLASSES.modal}"
  >
    <!-- Search input -->
    <div class="relative border-b border-gray-200">
      <MagnifyingGlass class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth="2" />
      <input
        use:registerInput
        type="text"
        value={searchState.query}
        oninput={(e) => search.setQuery(e.currentTarget.value, { shouldLoadFacets: true })}
        placeholder={$i18n.t('globalSearch.placeholder')}
        class="w-full pl-12 pr-4 py-4 text-lg font-body text-gray-900 placeholder-gray-400 focus-visible:outline-none"
        autocomplete="off"
        role="combobox"
        aria-expanded={showResults || showRecentSearches}
        aria-controls="global-search-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        tabindex={$isSearchOpen ? undefined : -1}
      />
      {#if searchState.isSearching}
        <div class="absolute right-4 top-1/2 -translate-y-1/2">
          <Spinner size="md" />
        </div>
      {/if}
    </div>

    {#if $isSearchOpen}
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
              <span>{$i18n.t('globalSearch.recentSearches')}</span>
              <button
                type="button"
                onclick={() => search.clearRecentSearches()}
                class="text-xs text-gray-400 hover:text-gray-600 font-normal normal-case"
              >
                {$i18n.t('globalSearch.clearAll')}
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
                    <Clock class="w-4 h-4 text-gray-400" strokeWidth="2" />
                    <span class="font-body text-sm text-gray-700">{recentQuery}</span>
                  </div>
                  <button
                    type="button"
                    onclick={(e) => handleDeleteRecentSearch(e, recentQuery)}
                    class="p-1 text-gray-400 hover:text-gray-600 rounded"
                    aria-label={$i18n.t('aria.removeRecentSearch')}
                  >
                    <XMark class="w-4 h-4" strokeWidth="2" />
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {:else if showResults}
          <!-- Search results -->
          <ul id="global-search-listbox" role="listbox" class="p-2">
            {#each searchState.results as friend, index}
              {@const matchBadge = findMatchSourceBadge(friend.matchSource)}
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
                          {$i18n.t('globalSearch.jobAtOrg', {
                            jobTitle: friend.jobTitle,
                            organization: friend.organization,
                          })}
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
                        {@html sanitizeHeadline(friend.headline)}
                      </div>
                    {/if}
                  </div>
                  {#if matchBadge}
                    <span class="shrink-0 {matchBadge.class}">
                      {$i18n.t(matchBadge.labelKey)}
                    </span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {:else if showEmptyState}
          <!-- No results -->
          <EmptyState
            icon={FaceSmile}
            title={$i18n.t('globalSearch.noMatch', { query: searchState.query })}
            hint={$i18n.t('globalSearch.tryDifferent')}
          >
            <Button size="sm" onclick={navigateToNewFriend}>
              <Plus class="w-4 h-4" strokeWidth="2" />
              {$i18n.t('globalSearch.addNewFriend')}
            </Button>
          </EmptyState>
        {:else if searchState.query.trim().length < 2 && searchState.recentSearches.length === 0}
          <!-- Initial state with no recent searches -->
          <EmptyState
            icon={MagnifyingGlass}
            title={$i18n.t('globalSearch.findFriends')}
            hint={$i18n.t('globalSearch.typeToSearch')}
          />
        {/if}
      </div>

      <!-- Footer: Mobile action buttons -->
      <div class="sm:hidden border-t border-gray-200 p-2 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" class="flex-1" onclick={() => search.close()}>
          <XMark class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('globalSearch.close')}
        </Button>
        <Button variant="ghostAccent" size="sm" class="flex-1" onclick={navigateToNewFriend}>
          <Plus class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('common.new')}
        </Button>
        <Button variant="ghostAccent" size="sm" class="flex-1" onclick={navigateToFriendsList}>
          <Users class="w-4 h-4" strokeWidth="2" />
          {$i18n.t('userMenu.friends')}
        </Button>
      </div>

      <!-- Footer: Desktop keyboard hints -->
      <div class="hidden sm:flex border-t border-gray-200 px-4 py-2 items-center justify-between text-xs text-gray-400">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <kbd class={CODE_CLASSES.kbd}>↑</kbd>
            <kbd class={CODE_CLASSES.kbd}>↓</kbd>
            <span>{$i18n.t('globalSearch.navigate')}</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class={CODE_CLASSES.kbd}>↵</kbd>
            <span>{$i18n.t('globalSearch.select')}</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class={CODE_CLASSES.kbd}>Esc</kbd>
            <span>{$i18n.t('globalSearch.close')}</span>
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={navigateToNewFriend}
            class="flex items-center gap-1.5 text-gray-500 hover:text-forest font-body transition-colors"
          >
            <kbd class={CODE_CLASSES.kbd}>
              {isMac ? '⌥' : 'Alt'}↵
            </kbd>
            <span>{$i18n.t('globalSearch.newFriend')}</span>
          </button>
          <button
            type="button"
            onclick={navigateToFriendsList}
            class="flex items-center gap-1.5 text-gray-500 hover:text-forest font-body transition-colors"
          >
            <kbd class={CODE_CLASSES.kbd}>
              {isMac ? '⌘' : 'Ctrl'}↵
            </kbd>
            <span>{$i18n.t('globalSearch.friendsList')}</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Style for highlighted search terms from ts_headline */
  :global(mark) {
    background-color: rgb(254 249 195); /* yellow-100 */
    color: rgb(17 24 39); /* gray-900 */
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
