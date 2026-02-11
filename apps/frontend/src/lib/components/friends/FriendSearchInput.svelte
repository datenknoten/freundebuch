<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult } from '$shared';
import FriendAvatar from './FriendAvatar.svelte';

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
  /** Called when a friend is selected (viaKeyboard is true if Enter was used) */
  onSelect?: (friend: FriendSearchResult, viaKeyboard: boolean) => void;
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
  onSelect,
  disabledCheck,
  noResultsText,
  id = 'friend-search',
}: Props = $props();

onMount(() => {
  if (autofocus && inputElement) {
    // Small delay to ensure the element is fully rendered
    requestAnimationFrame(() => {
      inputElement?.focus();
    });
  }
});

let query = $state('');
let results = $state<FriendSearchResult[]>([]);
let isSearching = $state(false);
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement: HTMLInputElement;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

function isItemDisabled(friend: FriendSearchResult): string | null {
  return disabledCheck?.(friend) ?? null;
}

function findNextSelectableIndex(current: number, direction: 1 | -1): number {
  let next = current + direction;
  while (next >= 0 && next < results.length) {
    if (!isItemDisabled(results[next])) {
      return next;
    }
    next += direction;
  }
  // If going down and nothing found, stay at current; if going up past -1, allow -1
  if (direction === -1 && next < 0) return -1;
  return current;
}

// Debounced search
function handleInput() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  if (!query.trim()) {
    results = [];
    showDropdown = false;
    return;
  }

  debounceTimeout = setTimeout(async () => {
    await performSearch();
  }, 300);
}

async function performSearch() {
  if (!query.trim()) {
    results = [];
    showDropdown = false;
    return;
  }

  isSearching = true;
  try {
    results = await friends.searchFriends(query, excludeFriendId, limit);
    showDropdown = results.length > 0;
    highlightedIndex = -1;
  } catch {
    results = [];
    showDropdown = false;
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

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown) return;

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
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        selectFriend(results[highlightedIndex], true);
      }
      break;
    case 'Escape':
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
  if (results.length > 0) {
    showDropdown = true;
  }
}
</script>

<div class="relative">
  <div class="relative">
    <input
      type="text"
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

    {#if isSearching}
      <div class="absolute right-3 top-1/2 -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-forest border-t-transparent"></div>
      </div>
    {:else}
      <svg
        class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    {/if}
  </div>

  {#if showDropdown}
    <ul
      id="{id}-listbox"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each results as friend, index}
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

      {#if results.length === 0 && query.trim() && !isSearching}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          {noResultsText ?? $i18n.t('friendSearch.noResults')}
        </li>
      {/if}
    </ul>
  {/if}
</div>
