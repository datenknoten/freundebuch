<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import PencilSquare from 'svelte-heros-v2/PencilSquare.svelte';
import { formClasses, Spinner, surfaceClasses } from '$lib/components/ui';
import type { StreetInfo } from '$shared';

interface Props {
  /** Available streets to select from */
  streets: StreetInfo[];
  /** Currently selected street */
  value: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether free text mode is enabled (no street data available) */
  freeTextMode?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when a street is selected (second param indicates if free text was used) */
  onSelect?: (street: string, isFreeText: boolean) => void;
}

let {
  streets,
  value,
  isLoading = false,
  freeTextMode = false,
  disabled = false,
  onSelect,
}: Props = $props();

// Initialize query with value if we have one (for editing existing addresses)
let query = $state((() => value || '')());
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement = $state<HTMLInputElement | undefined>(undefined);
let manualEntry = $state(false);

// Filter streets based on query
const filteredStreets = $derived(() => {
  const q = query.toLowerCase().trim();
  if (!q) return streets;
  return streets.filter((street) => street.name.toLowerCase().includes(q));
});

function selectStreet(street: StreetInfo) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  manualEntry = false;
  onSelect?.(street.name, false);
}

function handleInput() {
  showDropdown = true;
  highlightedIndex = -1;
}

function handleKeydown(e: KeyboardEvent) {
  if (freeTextMode || manualEntry) {
    // In free text mode, just update the value on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect?.(query, true);
    }
    return;
  }

  if (!showDropdown) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      showDropdown = true;
    }
    return;
  }

  const list = filteredStreets();

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      // +1 for "Enter manually" option
      highlightedIndex = Math.min(highlightedIndex + 1, list.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex === list.length) {
        // "Enter manually" option selected
        manualEntry = true;
        showDropdown = false;
      } else if (highlightedIndex >= 0 && highlightedIndex < list.length) {
        selectStreet(list[highlightedIndex]);
      } else if (query.trim() && list.length > 0) {
        // No explicit highlight, but the user searched and there are matches:
        // select the top match so Enter confirms the visible result.
        selectStreet(list[0]);
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
      break;
  }
}

function handleBlur() {
  setTimeout(() => {
    showDropdown = false;
    highlightedIndex = -1;
    // If in manual entry mode and user blurred, commit the value
    if ((manualEntry || freeTextMode) && query) {
      onSelect?.(query, true);
    }
  }, 200);
}

function handleFocus() {
  if (!freeTextMode && !manualEntry && streets.length > 0) {
    showDropdown = true;
  }
}

function activateInput() {
  if (disabled) return;
  query = '';
  manualEntry = false;
  if (!freeTextMode && streets.length > 0) {
    showDropdown = true;
  }
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

function enableManualEntry() {
  manualEntry = true;
  showDropdown = false;
  query = '';
  requestAnimationFrame(() => {
    inputElement?.focus();
  });
}
</script>

<div class="relative">
  <label for="street-input" class={formClasses.label}>Street</label>

  <div class="relative">
    {#if value && !showDropdown && !manualEntry && streets.length > 0 && !freeTextMode}
      <!-- Show selected value as a focusable button (only when we have street data) -->
      <button
        type="button"
        onclick={activateInput}
        onkeydown={handleButtonKeydown}
        disabled={disabled || isLoading}
        class="{formClasses.inputSm} flex items-center justify-between text-left {disabled ||
        isLoading
          ? 'opacity-50 cursor-not-allowed bg-gray-50'
          : 'bg-white cursor-pointer hover:border-gray-400'}"
      >
        <span class="text-gray-900">{value}</span>
        {#if isLoading}
          <Spinner size="sm" tone="current" />
        {:else}
          <ChevronDown class="w-4 h-4 text-gray-400" strokeWidth="2" />
        {/if}
      </button>
    {:else}
      <!-- Show search/text input -->
      <div class="relative">
        <input
          id="street-input"
          type="text"
          bind:this={inputElement}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={handleBlur}
          onfocus={handleFocus}
          placeholder={freeTextMode || manualEntry ? 'Enter street name' : 'Search streets...'}
          {disabled}
          class="{formClasses.inputSm} pr-10"
          autocomplete="off"
          role={freeTextMode || manualEntry ? 'textbox' : 'combobox'}
          aria-expanded={showDropdown}
          aria-haspopup={freeTextMode || manualEntry ? 'false' : 'listbox'}
          aria-autocomplete={freeTextMode || manualEntry ? 'none' : 'list'}
        />

        {#if isLoading}
          <Spinner size="sm" class="absolute right-3 top-1/2 -translate-y-1/2" />
        {:else if !freeTextMode && !manualEntry}
          <MagnifyingGlass class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth="2" />
        {/if}
      </div>
    {/if}
  </div>

  {#if showDropdown && !isLoading && !freeTextMode && !manualEntry}
    <ul
      class="absolute z-(--z-popover) w-full mt-1 {surfaceClasses.listbox}"
      role="listbox"
    >
      {#each filteredStreets() as street, index}
        <li role="option" aria-selected={highlightedIndex === index} class="cursor-pointer">
          <button
            type="button"
            onclick={() => selectStreet(street)}
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <span class="font-body text-sm text-gray-900">{street.name}</span>
            {#if street.type}
              <span class="text-xs text-gray-400">{street.type}</span>
            {/if}
          </button>
        </li>
      {/each}

      <!-- "Enter manually" option -->
      <li
        role="option"
        aria-selected={highlightedIndex === filteredStreets().length}
        class="cursor-pointer border-t border-gray-100"
      >
        <button
          type="button"
          onclick={enableManualEntry}
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === filteredStreets().length ? 'bg-gray-100' : ''}"
        >
          <PencilSquare class="w-4 h-4 text-gray-400" strokeWidth="2" />
          <span class="font-body text-sm text-gray-600">Enter manually</span>
        </button>
      </li>

      {#if filteredStreets().length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">No matching streets found</li>
      {/if}
    </ul>
  {/if}
</div>
