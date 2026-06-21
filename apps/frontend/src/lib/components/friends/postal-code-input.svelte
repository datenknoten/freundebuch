<script lang="ts">
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import type { PostalCodeInfo } from '$shared';

interface Props {
  /** Current postal code value */
  value: string;
  /** Whether data is loading (city lookup in progress) */
  isLoading?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Postal-code suggestions for the current prefix */
  suggestions?: PostalCodeInfo[];
  /** Called when the postal code changes */
  onChange?: (value: string) => void;
  /** Called when a suggestion is picked */
  onSuggestionSelect?: (postalCode: string, city: string) => void;
}

let {
  value = $bindable(),
  isLoading = false,
  disabled = false,
  suggestions = [],
  onChange,
  onSuggestionSelect,
}: Props = $props();

let inputElement: HTMLInputElement;
let showDropdown = $state(false);
let highlightedIndex = $state(-1);

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  value = target.value;
  showDropdown = true;
  highlightedIndex = -1;
  onChange?.(target.value);
}

function selectSuggestion(suggestion: PostalCodeInfo) {
  value = suggestion.postalCode;
  showDropdown = false;
  highlightedIndex = -1;
  onSuggestionSelect?.(suggestion.postalCode, suggestion.city);
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown || suggestions.length === 0) {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      showDropdown = true;
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[highlightedIndex]);
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

function handleFocus() {
  if (suggestions.length > 0) {
    showDropdown = true;
  }
}

function handleBlur() {
  setTimeout(() => {
    showDropdown = false;
    highlightedIndex = -1;
  }, 200);
}

// Expose focus method for parent component
export function focus() {
  inputElement?.focus();
}
</script>

<div class="relative">
  <label for="postal-code-input" class="block text-sm font-medium text-gray-700 font-body mb-1">Postal Code</label>

  <div class="relative">
    <input
      id="postal-code-input"
      type="text"
      bind:this={inputElement}
      {value}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={handleFocus}
      onblur={handleBlur}
      placeholder="Enter postal code"
      {disabled}
      class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      autocomplete="off"
      role="combobox"
      aria-expanded={showDropdown}
      aria-haspopup="listbox"
      aria-autocomplete="list"
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
    {:else if suggestions.length > 0}
      <MagnifyingGlass class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth="2" />
    {/if}
  </div>

  {#if showDropdown && !isLoading && suggestions.length > 0}
    <ul
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each suggestions as suggestion, index}
        <li role="option" aria-selected={highlightedIndex === index} class="cursor-pointer">
          <button
            type="button"
            onclick={() => selectSuggestion(suggestion)}
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <span class="font-body text-sm font-medium text-gray-900">{suggestion.postalCode}</span>
            <span class="font-body text-sm text-gray-500">{suggestion.city}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if value && value.length < 3 && !disabled}
    <p class="mt-1 text-xs text-gray-500 font-body">Enter at least 3 characters</p>
  {/if}
</div>
