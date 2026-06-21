<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { autoFocus } from '$lib/actions/auto-focus';
import { listFriends } from '$lib/api/friends';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult } from '$shared';
import FriendAvatar from './friend-avatar.svelte';

const i18n = createI18n();

interface Props {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Friend ID to exclude from search results (e.g., current friend) */
  excludeFriendId?: string;
  /** Maximum number of results to show */
  limit?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to autofocus the input on mount */
  autofocus?: boolean;
  /** Currently selected friend, shown inline as the combobox value */
  selected?: FriendSearchResult | null;
  /** Called when a friend is selected (viaKeyboard is true if Enter was used) */
  onSelect?: (friend: FriendSearchResult, viaKeyboard: boolean) => void;
  /** Called when the current selection is cleared */
  onClear?: () => void;
  /** Returns a disabled label for a friend (e.g. "Already a member"), or null if enabled */
  disabledCheck?: (friend: FriendSearchResult) => string | null;
  /** Override the "no results" text (defaults to i18n friendSearch.noResults) */
  noResultsText?: string;
  /** Unique ID prefix for ARIA attributes (defaults to 'friend-search') */
  id?: string;
}

let {
  placeholder = 'Search friends...',
  excludeFriendId,
  limit = 10,
  disabled = false,
  autofocus = false,
  selected = null,
  onSelect,
  onClear,
  disabledCheck,
  noResultsText,
  id = 'friend-search',
}: Props = $props();

let query = $state('');
let results = $state<FriendSearchResult[]>([]);
let suggestions = $state<FriendSearchResult[]>([]);
let suggestionsLoaded = $state(false);
let isSearching = $state(false);
let isLoadingSuggestions = $state(false);
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement = $state<HTMLInputElement | undefined>(undefined);
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

// When there is no query, show the suggestion list (like the relationship-type
// and postal-code dropdowns, which surface options on focus).
let displayResults = $derived(query.trim() ? results : suggestions);
let isLoading = $derived(query.trim() ? isSearching : isLoadingSuggestions);

function isItemDisabled(friend: FriendSearchResult): string | null {
  return disabledCheck?.(friend) ?? null;
}

function findNextSelectableIndex(current: number, direction: 1 | -1): number {
  let next = current + direction;
  while (next >= 0 && next < displayResults.length) {
    if (!isItemDisabled(displayResults[next])) {
      return next;
    }
    next += direction;
  }
  // If going down and nothing found, stay at current; if going up past -1, allow -1
  if (direction === -1 && next < 0) return -1;
  return current;
}

// Load an initial list of friends to show before the user types anything.
async function loadSuggestions() {
  if (suggestionsLoaded || isLoadingSuggestions) return;

  isLoadingSuggestions = true;
  try {
    const { friends: list } = await listFriends({
      pageSize: limit,
      sortBy: 'display_name',
      sortOrder: 'asc',
    });
    suggestions = list
      .filter((f) => f.id !== excludeFriendId)
      .map((f) => ({
        id: f.id,
        displayName: f.displayName,
        photoThumbnailUrl: f.photoThumbnailUrl,
      }));
    suggestionsLoaded = true;
  } catch {
    suggestions = [];
  } finally {
    isLoadingSuggestions = false;
    if (!query.trim()) highlightedIndex = findNextSelectableIndex(-1, 1);
  }
}

// Debounced search
function handleInput() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  showDropdown = true;

  if (!query.trim()) {
    results = [];
    highlightedIndex = findNextSelectableIndex(-1, 1);
    return;
  }

  debounceTimeout = setTimeout(async () => {
    await performSearch();
  }, 300);
}

async function performSearch() {
  if (!query.trim()) {
    results = [];
    return;
  }

  isSearching = true;
  try {
    results = await friends.searchFriends(query, excludeFriendId, limit);
    showDropdown = true;
    highlightedIndex = findNextSelectableIndex(-1, 1);
  } catch {
    results = [];
  } finally {
    isSearching = false;
  }
}

function selectFriend(friend: FriendSearchResult, viaKeyboard = false) {
  if (isItemDisabled(friend)) return;
  query = '';
  results = [];
  showDropdown = false;
  highlightedIndex = -1;
  onSelect?.(friend, viaKeyboard);
}

function clearSelection() {
  if (disabled) return;
  onClear?.();
  // Re-open the search so the user can pick another friend straight away.
  query = '';
  requestAnimationFrame(() => {
    inputElement?.focus();
  });
}

// Open the search input and dropdown from the inline selected-value button.
function activateInput() {
  if (disabled) return;
  query = '';
  showDropdown = true;
  loadSuggestions();
  requestAnimationFrame(() => {
    inputElement?.focus();
  });
}

function handleButtonKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault();
    activateInput();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown) {
    // Match the relationship-type / postal-code dropdowns: open on ArrowDown/Enter.
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      showDropdown = true;
      if (!query.trim()) loadSuggestions();
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = findNextSelectableIndex(highlightedIndex, 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = findNextSelectableIndex(highlightedIndex, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < displayResults.length) {
        selectFriend(displayResults[highlightedIndex], true);
      }
      break;
    case 'Escape':
      showDropdown = false;
      highlightedIndex = -1;
      break;
    case 'Tab':
      showDropdown = false;
      highlightedIndex = -1;
      break;
  }
}

function handleBlur() {
  // Delay hiding dropdown to allow click events on results
  setTimeout(() => {
    showDropdown = false;
    highlightedIndex = -1;
  }, 200);
}

function handleFocus() {
  showDropdown = true;
  if (!query.trim()) loadSuggestions();
}
</script>

<div class="relative">
  <div class="relative">
    {#if selected && !showDropdown}
      <!-- Selected friend shown inline (click to change, like the relationship-type dropdown) -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={activateInput}
          onkeydown={handleButtonKeydown}
          {disabled}
          class="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg font-body text-sm flex items-center justify-between text-left focus:ring-2 focus:ring-forest focus:border-transparent {disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer hover:border-gray-400'}"
          aria-haspopup="listbox"
        >
          <span class="flex items-center gap-3 min-w-0">
            <FriendAvatar
              displayName={selected.displayName}
              photoUrl={selected.photoThumbnailUrl}
              size="sm"
            />
            <span class="truncate text-gray-900">{selected.displayName}</span>
          </span>
          <ChevronDown class="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth="2" />
        </button>
        <button
          type="button"
          onclick={clearSelection}
          {disabled}
          class="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label={$i18n.t('common.clear')}
        >
          <XMark class="w-4 h-4" strokeWidth="2" />
        </button>
      </div>
    {:else}
      <input
        type="text"
        use:autoFocus={autofocus && !selected}
        bind:this={inputElement}
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={handleFocus}
        {placeholder}
        {disabled}
        class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        autocomplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="{id}-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

      {#if isLoading}
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-forest border-t-transparent"></div>
        </div>
      {:else}
        <MagnifyingGlass class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth="2" />
      {/if}
    {/if}
  </div>

  {#if showDropdown}
    <ul
      id="{id}-listbox"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each displayResults as friend, index (friend.id)}
        {@const disabledLabel = isItemDisabled(friend)}
        <li
          role="option"
          aria-selected={highlightedIndex === index}
          aria-disabled={disabledLabel !== null}
        >
          <button
            type="button"
            onclick={() => selectFriend(friend)}
            disabled={disabledLabel !== null}
            class="w-full flex items-center gap-3 px-3 py-2 transition-colors {disabledLabel !== null ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'} {highlightedIndex === index && disabledLabel === null ? 'bg-gray-100' : ''}"
          >
            <FriendAvatar
              displayName={friend.displayName}
              photoUrl={friend.photoThumbnailUrl}
              size="sm"
            />
            <span class="font-body text-sm {disabledLabel !== null ? 'text-gray-500' : 'text-gray-900'}">{friend.displayName}</span>
            {#if disabledLabel}
              <span class="ml-auto text-xs text-gray-400 font-body italic">{disabledLabel}</span>
            {/if}
          </button>
        </li>
      {/each}

      {#if displayResults.length === 0 && !isLoading}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          {noResultsText ?? $i18n.t('friendSearch.noResults')}
        </li>
      {/if}
    </ul>
  {/if}
</div>
