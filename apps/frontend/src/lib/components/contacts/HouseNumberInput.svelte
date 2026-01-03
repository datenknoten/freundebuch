<script lang="ts">
import type { HouseNumberInfo } from '$shared';

interface Props {
  /** Available house numbers to select from */
  houseNumbers: HouseNumberInfo[];
  /** Currently selected house number */
  value: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether free text mode is enabled (no house number data available) */
  freeTextMode?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when a house number is selected */
  onSelect?: (houseNumber: string) => void;
}

let {
  houseNumbers,
  value = $bindable(),
  isLoading = false,
  freeTextMode = false,
  disabled = false,
  onSelect,
}: Props = $props();

// Initialize query with value if we have one (for editing existing addresses)
let query = $state(value || '');
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement: HTMLInputElement;
let manualEntry = $state(false);

// Filter house numbers based on query
const filteredNumbers = $derived(() => {
  const q = query.toLowerCase().trim();
  if (!q) return houseNumbers;
  return houseNumbers.filter((hn) => hn.number.toLowerCase().includes(q));
});

function selectNumber(hn: HouseNumberInfo) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  manualEntry = false;
  value = hn.number;
  onSelect?.(hn.number);
}

function handleInput() {
  if (!freeTextMode && !manualEntry) {
    showDropdown = true;
  }
  highlightedIndex = -1;
}

function handleKeydown(e: KeyboardEvent) {
  if (freeTextMode || manualEntry) {
    if (e.key === 'Enter') {
      e.preventDefault();
      value = query;
      onSelect?.(query);
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

  const list = filteredNumbers();

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, list.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex === list.length) {
        manualEntry = true;
        showDropdown = false;
      } else if (highlightedIndex >= 0 && highlightedIndex < list.length) {
        selectNumber(list[highlightedIndex]);
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
    if ((manualEntry || freeTextMode) && query) {
      value = query;
      onSelect?.(query);
    }
  }, 200);
}

function handleFocus() {
  if (!freeTextMode && !manualEntry && houseNumbers.length > 0) {
    showDropdown = true;
  }
}

function activateInput() {
  if (disabled) return;
  query = '';
  manualEntry = false;
  if (!freeTextMode && houseNumbers.length > 0) {
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
  <label class="block text-sm font-medium text-gray-700 font-body mb-1">House Number</label>

  <div class="relative">
    {#if value && !showDropdown && !manualEntry && houseNumbers.length > 0 && !freeTextMode}
      <!-- Show selected value as a focusable button (only when we have house number data) -->
      <button
        type="button"
        onclick={activateInput}
        onkeydown={handleButtonKeydown}
        disabled={disabled || isLoading}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg font-body text-sm flex items-center justify-between text-left focus:ring-2 focus:ring-forest focus:border-transparent {disabled || isLoading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer hover:border-gray-400'}"
      >
        <span class="text-gray-900">{value}</span>
        {#if isLoading}
          <svg
            class="animate-spin h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        {:else}
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        {/if}
      </button>
    {:else}
      <!-- Show text input -->
      <div class="relative">
        <input
          type="text"
          bind:this={inputElement}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={handleBlur}
          onfocus={handleFocus}
          placeholder={freeTextMode || manualEntry ? 'Enter house number' : 'Search or select...'}
          {disabled}
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          autocomplete="off"
          role={freeTextMode || manualEntry ? 'textbox' : 'combobox'}
          aria-expanded={showDropdown}
          aria-haspopup={freeTextMode || manualEntry ? 'false' : 'listbox'}
          aria-autocomplete={freeTextMode || manualEntry ? 'none' : 'list'}
        />

        {#if isLoading}
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              class="animate-spin h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if showDropdown && !isLoading && !freeTextMode && !manualEntry}
    <ul
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      role="listbox"
    >
      {#each filteredNumbers() as hn, index}
        <li role="option" aria-selected={highlightedIndex === index} class="cursor-pointer">
          <button
            type="button"
            onclick={() => selectNumber(hn)}
            class="w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <span class="font-body text-sm text-gray-900">{hn.number}</span>
          </button>
        </li>
      {/each}

      <li
        role="option"
        aria-selected={highlightedIndex === filteredNumbers().length}
        class="cursor-pointer border-t border-gray-100"
      >
        <button
          type="button"
          onclick={enableManualEntry}
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === filteredNumbers().length ? 'bg-gray-100' : ''}"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span class="font-body text-sm text-gray-600">Enter manually</span>
        </button>
      </li>

      {#if filteredNumbers().length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">No matching numbers found</li>
      {/if}
    </ul>
  {/if}
</div>
