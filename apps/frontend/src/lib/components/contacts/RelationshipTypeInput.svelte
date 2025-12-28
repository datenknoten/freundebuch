<script lang="ts">
import { onMount } from 'svelte';
import type { RelationshipType, RelationshipTypeId, RelationshipTypesGrouped } from '$shared';

interface Props {
  /** The relationship types grouped by category */
  relationshipTypes: RelationshipTypesGrouped;
  /** The currently selected type ID */
  value: RelationshipTypeId;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to autofocus the input on mount */
  autofocus?: boolean;
  /** Called when a type is selected (viaKeyboard is true if Enter was used) */
  onSelect?: (typeId: RelationshipTypeId, viaKeyboard: boolean) => void;
}

let { relationshipTypes, value, disabled = false, autofocus = false, onSelect }: Props = $props();

let query = $state('');
let showDropdown = $state(false);
let highlightedIndex = $state(-1);
let inputElement: HTMLInputElement;

// Category labels and colors
const categoryConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  family: { label: 'Family', bgColor: 'bg-rose-50', textColor: 'text-rose-700' },
  professional: { label: 'Professional', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  social: { label: 'Social', bgColor: 'bg-green-50', textColor: 'text-green-700' },
};

// Flatten all types for filtering
const allTypes = $derived(() => {
  const types: Array<RelationshipType & { category: string }> = [];
  for (const [category, categoryTypes] of Object.entries(relationshipTypes)) {
    for (const type of categoryTypes) {
      types.push({ ...type, category });
    }
  }
  return types;
});

// Filter types based on query
const filteredTypes = $derived(() => {
  const q = query.toLowerCase().trim();
  if (!q) return allTypes();
  return allTypes().filter(
    (type) =>
      type.label.toLowerCase().includes(q) ||
      type.id.toLowerCase().includes(q) ||
      type.category.toLowerCase().includes(q),
  );
});

// Get the selected type's label
const selectedLabel = $derived(() => {
  const type = allTypes().find((t) => t.id === value);
  return type?.label ?? '';
});

let containerElement: HTMLDivElement;

onMount(() => {
  if (autofocus && inputElement) {
    requestAnimationFrame(() => {
      inputElement?.focus();
    });
  }

  // Listen for activate event from parent
  function handleActivate() {
    activateInput();
  }

  const parent = containerElement?.parentElement;
  parent?.addEventListener('activate', handleActivate);
  return () => parent?.removeEventListener('activate', handleActivate);
});

function selectType(type: RelationshipType & { category: string }, viaKeyboard = false) {
  query = '';
  showDropdown = false;
  highlightedIndex = -1;
  onSelect?.(type.id as RelationshipTypeId, viaKeyboard);
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

  const types = filteredTypes();

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, types.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, -1);
      break;
    case 'Enter':
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < types.length) {
        selectType(types[highlightedIndex], true);
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
  // Use requestAnimationFrame to ensure the input is rendered before focusing
  requestAnimationFrame(() => {
    inputElement?.focus();
  });
}

function handleButtonKeydown(e: KeyboardEvent) {
  // Activate input on Enter, Space, or ArrowDown - let Tab pass through naturally
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
    e.preventDefault();
    activateInput();
  }
}
</script>

<div class="relative" bind:this={containerElement}>
  <div class="relative">
    {#if value && !showDropdown}
      <!-- Show selected value as a focusable button -->
      <button
        type="button"
        onclick={activateInput}
        onkeydown={handleButtonKeydown}
        {disabled}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg font-body text-sm flex items-center justify-between text-left focus:ring-2 focus:ring-forest focus:border-transparent {disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white cursor-pointer hover:border-gray-400'}"
      >
        <div class="flex items-center gap-2">
          {#each allTypes().filter((t) => t.id === value) as type}
            <span
              class="px-2 py-0.5 rounded text-xs font-medium {categoryConfig[type.category]?.bgColor} {categoryConfig[type.category]?.textColor}"
            >
              {categoryConfig[type.category]?.label}
            </span>
            <span class="text-gray-900">{type.label}</span>
          {/each}
        </div>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    {:else}
      <!-- Show search input -->
      <input
        type="text"
        bind:this={inputElement}
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onblur={handleBlur}
        onfocus={handleFocus}
        placeholder="Search relationship types..."
        {disabled}
        class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        autocomplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />

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
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      role="listbox"
    >
      {#each filteredTypes() as type, index}
        <li
          role="option"
          aria-selected={highlightedIndex === index}
          class="cursor-pointer"
        >
          <button
            type="button"
            onclick={() => selectType(type)}
            class="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors {highlightedIndex === index ? 'bg-gray-100' : ''}"
          >
            <span
              class="px-2 py-0.5 rounded text-xs font-medium {categoryConfig[type.category]?.bgColor} {categoryConfig[type.category]?.textColor}"
            >
              {categoryConfig[type.category]?.label}
            </span>
            <span class="font-body text-sm text-gray-900">{type.label}</span>
          </button>
        </li>
      {/each}

      {#if filteredTypes().length === 0}
        <li class="px-3 py-2 text-sm text-gray-500 font-body">
          No matching types found
        </li>
      {/if}
    </ul>
  {/if}
</div>
