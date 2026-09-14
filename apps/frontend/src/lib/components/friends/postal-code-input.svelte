<script lang="ts">
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import { formClasses, Spinner, surfaceClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { PostalCodeInfo } from '$shared';

const i18n = createI18n();

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
  <label for="postal-code-input" class={formClasses.label}>{$i18n.t('address.postalCode')}</label>

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
      placeholder={$i18n.t('address.postalCodePlaceholder')}
      {disabled}
      class="{formClasses.inputSm} pr-10"
      autocomplete="off"
      role="combobox"
      aria-expanded={showDropdown}
      aria-haspopup="listbox"
      aria-autocomplete="list"
    />

    {#if isLoading}
      <Spinner size="sm" class="absolute right-3 top-1/2 -translate-y-1/2" />
    {:else if suggestions.length > 0}
      <MagnifyingGlass class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth="2" />
    {/if}
  </div>

  {#if showDropdown && !isLoading && suggestions.length > 0}
    <ul
      class="absolute z-(--z-popover) w-full mt-1 {surfaceClasses.listbox}"
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
    <p class={formClasses.helper}>{$i18n.t('address.postalCodeHint')}</p>
  {/if}
</div>
