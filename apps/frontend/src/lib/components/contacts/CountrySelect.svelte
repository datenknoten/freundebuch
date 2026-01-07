<script lang="ts">
import type { CountryInfo } from '$shared';

interface Props {
  /** Available countries to select from */
  countries: CountryInfo[];
  /** Currently selected country code */
  value: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Called when a country is selected (viaKeyboard indicates if Enter was pressed) */
  onSelect?: (code: string, name: string, viaKeyboard: boolean) => void;
}

let { countries, value, isLoading = false, disabled = false, onSelect }: Props = $props();

let query = $state('');
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement = $state<HTMLInputElement | undefined>(undefined);

// Filter countries based on query
const filteredCountries = $derived(() => {
  const q = query.toLowerCase().trim();
  if (!q) return countries;
  return countries.filter(
    (country) => country.name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q),
  );
});

// Get the selected country's name
const selectedName = $derived(() => {
  const country = countries.find((c) => c.code === value);
  return country?.name ?? '';
});

function selectCountry(country: CountryInfo, viaKeyboard: boolean = false) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  onSelect?.(country.code, country.name, viaKeyboard);
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

  const list = filteredCountries();

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
        selectCountry(list[highlightedIndex], true);
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
</script>

<div class="relative">
  <label for="country-input" class="block text-sm font-medium text-gray-700 font-body mb-1">Country</label>

  <div class="relative">
    {#if value && !showDropdown}
      <!-- Show selected value as a focusable button -->
      <button
        type="button"
        onclick={activateInput}
        onkeydown={handleButtonKeydown}
        disabled={disabled || isLoading}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg font-body text-sm flex items-center justify-between text-left focus:ring-2 focus:ring-forest focus:border-transparent {disabled || isLoading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer hover:border-gray-400'}"
      >
        <div class="flex items-center gap-2">
          <span class="text-gray-500">{value}</span>
          <span class="text-gray-900">{selectedName()}</span>
        </div>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    {:else}
      <!-- Show search input -->
      <div class="relative">
        <input
          id="country-input"
          type="text"
          bind:this={inputElement}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={handleBlur}
          onfocus={handleFocus}
          placeholder={isLoading ? 'Loading countries...' : 'Search countries...'}
          disabled={disabled || isLoading}
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          autocomplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="country-select-listbox"
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
        {:else}
          <svg
            class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
        {/if}
      </div>
    {/if}
  </div>

  {#if showDropdown && !isLoading}
    <ul
      id="country-select-listbox"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each filteredCountries() as country, index}
        <li role="option" aria-selected={highlightedIndex === index} class="cursor-pointer">
          <button
            type="button"
            onclick={() => selectCountry(country)}
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <span class="text-gray-500 text-sm font-mono w-8">{country.code}</span>
            <span class="font-body text-sm text-gray-900">{country.name}</span>
          </button>
        </li>
      {/each}

      {#if filteredCountries().length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">No matching countries found</li>
      {/if}
    </ul>
  {/if}
</div>
