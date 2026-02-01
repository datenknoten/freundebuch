<script lang="ts">
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';

interface Props {
  /** Selected friend IDs */
  selectedFriends: FriendSearchResult[];
  /** Placeholder text for the input */
  placeholder?: string;
  /** Maximum number of search results to show */
  limit?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when selection changes */
  onChange?: (friends: FriendSearchResult[]) => void;
}

let {
  selectedFriends = [],
  placeholder = 'Search and add friends...',
  limit = 10,
  disabled = false,
  onChange,
}: Props = $props();

let query = $state('');
let results = $state<FriendSearchResult[]>([]);
let isSearching = $state(false);
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement: HTMLInputElement;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Filter out already selected friends from results
let filteredResults = $derived(results.filter((r) => !selectedFriends.some((s) => s.id === r.id)));

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
    results = await friends.searchFriends(query, undefined, limit);
    showDropdown = filteredResults.length > 0;
    highlightedIndex = -1;
  } catch {
    results = [];
    showDropdown = false;
  } finally {
    isSearching = false;
  }
}

function addFriend(friend: FriendSearchResult) {
  const newSelection = [...selectedFriends, friend];
  onChange?.(newSelection);
  query = '';
  results = [];
  showDropdown = false;
  highlightedIndex = -1;
  inputElement?.focus();
}

function removeFriend(friendId: string) {
  const newSelection = selectedFriends.filter((f) => f.id !== friendId);
  onChange?.(newSelection);
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, filteredResults.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredResults.length) {
        addFriend(filteredResults[highlightedIndex]);
      }
      break;
    case 'Escape':
      showDropdown = false;
      highlightedIndex = -1;
      break;
  }
}

function handleBlur() {
  setTimeout(() => {
    showDropdown = false;
    highlightedIndex = -1;
  }, 200);
}

function handleFocus() {
  if (filteredResults.length > 0) {
    showDropdown = true;
  }
}
</script>

<div class="space-y-2">
  <!-- Selected friends chips -->
  {#if selectedFriends.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each selectedFriends as friend (friend.id)}
        <div class="inline-flex items-center gap-2 bg-forest/10 text-forest px-3 py-1.5 rounded-full">
          <FriendAvatar
            displayName={friend.displayName}
            photoUrl={friend.photoThumbnailUrl}
            size="sm"
          />
          <span class="text-sm font-body">{friend.displayName}</span>
          <button
            type="button"
            onclick={() => removeFriend(friend.id)}
            {disabled}
            class="text-forest hover:text-forest-dark transition-colors disabled:opacity-50"
            aria-label="Remove {friend.displayName}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Search input -->
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
        aria-controls="friend-multi-select-listbox"
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
        id="friend-multi-select-listbox"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        role="listbox"
      >
        {#each filteredResults as friend, index (friend.id)}
          <li
            role="option"
            aria-selected={highlightedIndex === index}
            class="cursor-pointer"
          >
            <button
              type="button"
              onclick={() => addFriend(friend)}
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

        {#if filteredResults.length === 0 && query.trim() && !isSearching}
          <li class="px-3 py-2 text-sm text-gray-500 font-body">
            No friends found
          </li>
        {/if}
      </ul>
    {/if}
  </div>
</div>
