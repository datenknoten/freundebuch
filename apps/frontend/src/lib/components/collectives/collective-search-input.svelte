<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { autoFocus } from '$lib/actions/auto-focus.js';
import { createI18n } from '$lib/i18n/index.js';
import type { CollectiveListItem } from '$shared';
import FriendAvatar from '../friends/friend-avatar.svelte';

const i18n = createI18n();

interface Props {
  /** The collectives available for selection */
  collectives: CollectiveListItem[];
  /** The currently selected collective ID (external id), or '' when none */
  value: string;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to autofocus the input on mount */
  autofocus?: boolean;
  /** Called when a collective is selected (viaKeyboard is true if Enter was used) */
  onSelect?: (collectiveId: string, viaKeyboard: boolean) => void;
  /** Called when the current selection is cleared */
  onClear?: () => void;
  /** Unique ID prefix for ARIA attributes (defaults to 'collective-search') */
  id?: string;
}

let {
  collectives,
  value,
  placeholder,
  disabled = false,
  autofocus = false,
  onSelect,
  onClear,
  id = 'collective-search',
}: Props = $props();

let query = $state('');
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement = $state<HTMLInputElement | undefined>(undefined);

// Filter collectives based on query (matches name or type name).
// An empty query shows the full list as suggestions on focus.
const filteredCollectives = $derived.by(() => {
  const q = query.toLowerCase().trim();
  if (!q) return collectives;
  return collectives.filter(
    (c) => c.name.toLowerCase().includes(q) || c.type.name.toLowerCase().includes(q),
  );
});

// The currently selected collective object, if any.
const selectedCollective = $derived(collectives.find((c) => c.id === value) ?? null);

function selectCollective(collective: CollectiveListItem, viaKeyboard = false) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  onSelect?.(collective.id, viaKeyboard);
}

function handleInput() {
  showDropdown = true;
  highlightedIndex = -1;
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      showDropdown = true;
    }
    return;
  }

  const list = filteredCollectives;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, list.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < list.length) {
        selectCollective(list[highlightedIndex], true);
      } else if (query.trim() && list.length > 0) {
        // No explicit highlight, but the user searched and there are matches:
        // select the top match so Enter confirms the visible result.
        selectCollective(list[0], true);
      }
      break;
    case 'Escape':
      showDropdown = false;
      highlightedIndex = -1;
      query = '';
      break;
    case 'Tab':
      showDropdown = false;
      highlightedIndex = -1;
      query = '';
      break;
  }
}

function handleBlur() {
  // Delay hiding the dropdown to allow click events on results.
  setTimeout(() => {
    showDropdown = false;
    highlightedIndex = -1;
    query = '';
  }, 200);
}

function handleFocus() {
  showDropdown = true;
}

function activateInput() {
  if (disabled) return;
  query = '';
  showDropdown = true;
  // Defer focus so the input is rendered before focusing.
  requestAnimationFrame(() => {
    inputElement?.focus();
  });
}

function handleButtonKeydown(e: KeyboardEvent) {
  // Activate the input on Enter, Space, or ArrowDown - let Tab pass through.
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault();
    activateInput();
  }
}

function handleClear() {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  onClear?.();
}
</script>

<div class="relative">
  <div class="relative">
    {#if selectedCollective && !showDropdown}
      <!-- Show selected collective inline as a focusable control -->
      <div
        class="w-full pl-3 pr-2 py-2 border border-gray-300 rounded-lg font-body text-sm flex items-center justify-between gap-2 {disabled ? 'opacity-50 bg-gray-50' : 'bg-white'}"
      >
        <button
          type="button"
          {id}
          onclick={activateInput}
          onkeydown={handleButtonKeydown}
          {disabled}
          class="flex items-center gap-2 min-w-0 flex-1 text-left rounded focus:outline-none focus:ring-2 focus:ring-forest {disabled ? 'cursor-not-allowed' : 'cursor-pointer'}"
        >
          <FriendAvatar
            displayName={selectedCollective.name}
            photoUrl={selectedCollective.photoThumbnailUrl ?? undefined}
            size="sm"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-gray-900">{selectedCollective.name}</span>
            <span class="block truncate text-xs text-gray-500">{selectedCollective.type.name}</span>
          </span>
          <ChevronDown class="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth="2" />
        </button>
        <button
          type="button"
          onclick={handleClear}
          {disabled}
          aria-label={$i18n.t('common.clear')}
          class="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 disabled:cursor-not-allowed"
        >
          <XMark class="w-4 h-4" strokeWidth="2" />
        </button>
      </div>
    {:else}
      <!-- Show search input -->
      <input
        type="text"
        {id}
        bind:this={inputElement}
        bind:value={query}
        use:autoFocus={autofocus}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={handleFocus}
        placeholder={placeholder ?? $i18n.t('friendDetail.addToCollective.searchPlaceholder')}
        {disabled}
        class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        autocomplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="{id}-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

      <MagnifyingGlass class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth="2" />
    {/if}
  </div>

  {#if showDropdown}
    <ul
      id="{id}-listbox"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each filteredCollectives as collective, index (collective.id)}
        <li
          role="option"
          aria-selected={highlightedIndex === index}
          class="cursor-pointer"
        >
          <button
            type="button"
            onclick={() => selectCollective(collective)}
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <FriendAvatar
              displayName={collective.name}
              photoUrl={collective.photoThumbnailUrl ?? undefined}
              size="sm"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-body text-sm text-gray-900">{collective.name}</span>
              <span class="block truncate text-xs text-gray-500 font-body">{collective.type.name}</span>
            </span>
          </button>
        </li>
      {/each}

      {#if filteredCollectives.length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          {$i18n.t('friendDetail.addToCollective.noMatches')}
        </li>
      {/if}
    </ul>
  {/if}
</div>
