<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import PencilSquare from 'svelte-heros-v2/PencilSquare.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { HouseNumberInfoResponse } from '$shared';

const i18n = createI18n();

interface Props {
  /** Available house numbers to select from */
  houseNumbers: HouseNumberInfoResponse[];
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
let query = $state(value ?? '');
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement = $state<HTMLInputElement | undefined>(undefined);
let manualEntry = $state(false);

function filterNumbers() {
  const q = query.toLowerCase().trim();
  if (q === '') {
    return houseNumbers;
  }
  return houseNumbers.filter((hn) => hn.number.toLowerCase().includes(q));
}

const filteredNumbers = $derived.by(filterNumbers);

function selectNumber(hn: HouseNumberInfoResponse) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  manualEntry = false;
  value = hn.number;
  onSelect?.(hn.number);
}

function handleInput() {
  if (freeTextMode === false && manualEntry === false) {
    showDropdown = true;
  }
  highlightedIndex = -1;
}

function handleKeydown(e: KeyboardEvent) {
  if (freeTextMode === true || manualEntry === true) {
    if (e.key === 'Enter') {
      e.preventDefault();
      value = query;
      onSelect?.(query);
    }
    return;
  }

  if (showDropdown === false) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      showDropdown = true;
    }
    return;
  }

  const list = filteredNumbers;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, list.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter': {
      e.preventDefault();
      const highlighted = list[highlightedIndex];
      const topMatch = list[0];
      if (highlightedIndex === list.length) {
        manualEntry = true;
        showDropdown = false;
      } else if (highlighted !== undefined) {
        selectNumber(highlighted);
      } else if (query.trim() !== '' && topMatch !== undefined) {
        // No explicit highlight, but the user searched and there are matches:
        // select the top match so Enter confirms the visible result.
        selectNumber(topMatch);
      }
      break;
    }
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

function closeAndCommit() {
  showDropdown = false;
  highlightedIndex = -1;
  if ((manualEntry === true || freeTextMode === true) && query !== '') {
    value = query;
    onSelect?.(query);
  }
}

function handleBlur() {
  setTimeout(closeAndCommit, 200);
}

function handleFocus() {
  if (freeTextMode === false && manualEntry === false && houseNumbers.length > 0) {
    showDropdown = true;
  }
}

function focusInput() {
  inputElement?.focus();
}

function activateInput() {
  if (disabled === true) {
    return;
  }
  query = '';
  manualEntry = false;
  if (freeTextMode === false && houseNumbers.length > 0) {
    showDropdown = true;
  }
  requestAnimationFrame(focusInput);
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
  requestAnimationFrame(focusInput);
}
</script>

<div class="relative">
  <label for="house-number-input" class={FORM_CLASSES.label}>{$i18n.t('address.houseNumber')}</label>

  <div class="relative">
    {#if value && !showDropdown && !manualEntry && houseNumbers.length > 0 && !freeTextMode}
      <!-- Show selected value as a focusable button (only when we have house number data) -->
      <button
        type="button"
        onclick={activateInput}
        onkeydown={handleButtonKeydown}
        disabled={disabled || isLoading}
        class="{FORM_CLASSES.inputSm} flex items-center justify-between text-left {disabled ||
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
      <!-- Show text input -->
      <div class="relative">
        <input
          id="house-number-input"
          type="text"
          bind:this={inputElement}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={handleBlur}
          onfocus={handleFocus}
          placeholder={freeTextMode || manualEntry
            ? $i18n.t('address.houseNumberManualPlaceholder')
            : $i18n.t('address.houseNumberPlaceholder')}
          {disabled}
          class="{FORM_CLASSES.inputSm} pr-10"
          autocomplete="off"
          role={freeTextMode || manualEntry ? 'textbox' : 'combobox'}
          aria-expanded={showDropdown}
          aria-haspopup={freeTextMode || manualEntry ? 'false' : 'listbox'}
          aria-autocomplete={freeTextMode || manualEntry ? 'none' : 'list'}
        />

        {#if isLoading}
          <Spinner size="sm" class="absolute right-3 top-1/2 -translate-y-1/2" />
        {/if}
      </div>
    {/if}
  </div>

  {#if showDropdown && !isLoading && !freeTextMode && !manualEntry}
    <ul
      class="absolute z-(--z-popover) w-full mt-1 {SURFACE_CLASSES.listbox}"
      role="listbox"
    >
      {#each filteredNumbers as hn, index}
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
        aria-selected={highlightedIndex === filteredNumbers.length}
        class="cursor-pointer border-t border-gray-100"
      >
        <button
          type="button"
          onclick={enableManualEntry}
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left {highlightedIndex === filteredNumbers.length ? 'bg-gray-100' : ''}"
        >
          <PencilSquare class="w-4 h-4 text-gray-400" strokeWidth="2" />
          <span class="font-body text-sm text-gray-600">{$i18n.t('address.enterManually')}</span>
        </button>
      </li>

      {#if filteredNumbers.length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          {$i18n.t('address.noMatchingNumbers')}
        </li>
      {/if}
    </ul>
  {/if}
</div>
