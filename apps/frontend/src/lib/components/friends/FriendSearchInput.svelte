<script lang="ts">
import { onMount } from 'svelte';
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult } from '$shared';
import FriendAvatar from './FriendAvatar.svelte';

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
}

let {
  placeholder = 'Search friends...',
  excludeFriendId,
  limit = 10,
  disabled = false,
  autofocus = false,
  onSelect,
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
      highlightedIndex = Math.min(highlightedIndex + 1, results.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
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
      aria-controls="friend-search-listbox"
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
      id="friend-search-listbox"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each results as friend, index}
        <li
          role="option"
          aria-selected={highlightedIndex === index}
          class="cursor-pointer"
        >
          <button
            type="button"
            onclick={() => selectFriend(friend)}
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <FriendAvatar
              displayName={friend.displayName}
              photoUrl={friend.photoThumbnailUrl}
              size="sm"
            />
            <span class="font-body text-sm text-gray-900">{friend.displayName}</span>
          </button>
        </li>
      {/each}

      {#if results.length === 0 && query.trim() && !isSearching}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          No friends found
        </li>
      {/if}
    </ul>
  {/if}
</div>
