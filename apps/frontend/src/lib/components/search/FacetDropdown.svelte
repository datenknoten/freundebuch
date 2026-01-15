<script lang="ts">
import { filterModeCategory, getKeyboardHint, isFilterModeActive } from '$lib/stores/ui';
import {
  type ArrayFacetField,
  type CircleFacetValue,
  type FacetFilters,
  type FacetGroups,
  isArrayFacetField,
} from '$shared';
import CircleChip from '../circles/CircleChip.svelte';

interface Props {
  facets: FacetGroups | null;
  activeFilters: FacetFilters;
  onFilterChange: (filters: FacetFilters) => void;
  isLoading?: boolean;
}

let { facets, activeFilters, onFilterChange, isLoading = false }: Props = $props();

// Filter circles to only show those with members (count > 0)
let circlesWithMembers = $derived<CircleFacetValue[]>(
  facets?.circles.filter((c) => c.count > 0) ?? [],
);
let isOpen = $state(false);

// Maximum items to show with keyboard hints (26 letters * 9 numbers = 234 max)
const MAX_KEYBOARD_ITEMS = 234;

// Build a flat list of filter values for a given category (for keyboard navigation)
function getCategoryValues(category: string): { field: ArrayFacetField; value: string }[] {
  if (!facets) return [];

  switch (category) {
    case 'country':
      return (
        facets.location
          .find((g) => g.field === 'country')
          ?.values.slice(0, MAX_KEYBOARD_ITEMS)
          .map((v) => ({ field: 'country' as ArrayFacetField, value: v.value })) ?? []
      );
    case 'city':
      return (
        facets.location
          .find((g) => g.field === 'city')
          ?.values.slice(0, MAX_KEYBOARD_ITEMS)
          .map((v) => ({ field: 'city' as ArrayFacetField, value: v.value })) ?? []
      );
    case 'organization':
      return (
        facets.professional
          .find((g) => g.field === 'organization')
          ?.values.slice(0, MAX_KEYBOARD_ITEMS)
          .map((v) => ({ field: 'organization' as ArrayFacetField, value: v.value })) ?? []
      );
    case 'job_title':
      return (
        facets.professional
          .find((g) => g.field === 'job_title')
          ?.values.slice(0, MAX_KEYBOARD_ITEMS)
          .map((v) => ({ field: 'job_title' as ArrayFacetField, value: v.value })) ?? []
      );
    case 'department':
      return (
        facets.professional
          .find((g) => g.field === 'department')
          ?.values.slice(0, MAX_KEYBOARD_ITEMS)
          .map((v) => ({ field: 'department' as ArrayFacetField, value: v.value })) ?? []
      );
    case 'relationship_category':
      return (
        facets.relationship
          .find((g) => g.field === 'relationship_category')
          ?.values.map((v) => ({
            field: 'relationship_category' as ArrayFacetField,
            value: v.value,
          })) ?? []
      );
    case 'circles':
      // Include "no-circle" option plus all circles with members
      return [
        { field: 'circles' as ArrayFacetField, value: 'no-circle' },
        ...circlesWithMembers.slice(0, MAX_KEYBOARD_ITEMS - 1).map((c) => ({
          field: 'circles' as ArrayFacetField,
          value: c.value,
        })),
      ];
    default:
      return [];
  }
}

// Track current category values for keyboard hints
let currentCategoryValues = $derived(
  $filterModeCategory ? getCategoryValues($filterModeCategory) : [],
);

// Auto-open dropdown when filter mode activates
$effect(() => {
  if ($isFilterModeActive && $filterModeCategory) {
    isOpen = true;
  }
});

// Method to toggle filter by index (called from keyboard shortcuts)
export function toggleFilterByIndex(index: number) {
  if (index < 0 || index >= currentCategoryValues.length) return;
  const { field, value } = currentCategoryValues[index];
  toggleFilter(field, value);
}

// Count total active filters (only array-type fields)
let activeCount = $derived(
  Object.entries(activeFilters).reduce((sum, [field, value]) => {
    if (isArrayFacetField(field as keyof FacetFilters) && Array.isArray(value)) {
      return sum + value.length;
    }
    return sum;
  }, 0),
);

// Check if facets are available (use circlesWithMembers for circle check)
let hasFacets = $derived(
  facets &&
    (facets.location.length > 0 ||
      facets.professional.length > 0 ||
      facets.relationship.length > 0 ||
      circlesWithMembers.length > 0),
);

function toggleFilter(field: ArrayFacetField, value: string) {
  const current = activeFilters[field] ?? [];
  const newValues = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  onFilterChange({
    ...activeFilters,
    [field]: newValues.length ? newValues : undefined,
  });
}

function isFilterActive(field: ArrayFacetField, value: string): boolean {
  return (activeFilters[field] ?? []).includes(value);
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.facet-dropdown')) {
    isOpen = false;
  }
}

$effect(() => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
});
</script>

<div class="relative facet-dropdown">
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation();
      isOpen = !isOpen;
    }}
    class="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
    class:border-forest={activeCount > 0}
    class:text-forest={activeCount > 0}
    class:border-gray-300={activeCount === 0}
    disabled={isLoading && !hasFacets}
  >
    {#if isLoading && !hasFacets}
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    {:else}
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>
    {/if}
    <span>Filters</span>
    {#if activeCount > 0}
      <span class="bg-forest text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
        {activeCount}
      </span>
    {/if}
  </button>

  {#if isOpen && hasFacets}
    <div
      class="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4 max-h-80 overflow-y-auto"
    >
      <!-- Location Facets -->
      {#if facets && facets.location.length > 0}
        <div class="mb-4">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Location
          </h4>
          {#each facets.location as group}
            {@const isKeyboardCategory =
              $isFilterModeActive && $filterModeCategory === group.field}
            <div class="mb-2" class:bg-amber-50={isKeyboardCategory} class:rounded={isKeyboardCategory} class:p-1={isKeyboardCategory}>
              <span class="text-xs text-gray-400">{group.label}</span>
              <div class="mt-1 space-y-1 overflow-y-auto" class:max-h-24={!isKeyboardCategory} class:max-h-64={isKeyboardCategory}>
                {#each group.values.slice(0, isKeyboardCategory ? 27 : 8) as facet, i}
                  <label
                    class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                  >
                    {#if isKeyboardCategory}
                      <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[1.25rem] text-center">{getKeyboardHint(i)}</kbd>
                    {/if}
                    <input
                      type="checkbox"
                      checked={isFilterActive(group.field, facet.value)}
                      onchange={() => toggleFilter(group.field, facet.value)}
                      class="rounded border-gray-300 text-forest focus:ring-forest"
                    />
                    <span class="flex-1 truncate">{facet.value}</span>
                    <span class="text-xs text-gray-400">{facet.count}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Professional Facets -->
      {#if facets && facets.professional.length > 0}
        <div class="mb-4 pt-2 border-t border-gray-100">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Professional
          </h4>
          {#each facets.professional as group}
            {@const isKeyboardCategory =
              $isFilterModeActive && $filterModeCategory === group.field}
            <div class="mb-2" class:bg-amber-50={isKeyboardCategory} class:rounded={isKeyboardCategory} class:p-1={isKeyboardCategory}>
              <span class="text-xs text-gray-400">{group.label}</span>
              <div class="mt-1 space-y-1 overflow-y-auto" class:max-h-24={!isKeyboardCategory} class:max-h-64={isKeyboardCategory}>
                {#each group.values.slice(0, isKeyboardCategory ? 27 : 8) as facet, i}
                  <label
                    class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                  >
                    {#if isKeyboardCategory}
                      <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[1.25rem] text-center">{getKeyboardHint(i)}</kbd>
                    {/if}
                    <input
                      type="checkbox"
                      checked={isFilterActive(group.field, facet.value)}
                      onchange={() => toggleFilter(group.field, facet.value)}
                      class="rounded border-gray-300 text-forest focus:ring-forest"
                    />
                    <span class="flex-1 truncate">{facet.value}</span>
                    <span class="text-xs text-gray-400">{facet.count}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Relationship Facets -->
      {#if facets && facets.relationship.length > 0}
        <div class="pt-2 border-t border-gray-100">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Relationship
          </h4>
          {#each facets.relationship as group}
            {@const isKeyboardCategory =
              $isFilterModeActive && $filterModeCategory === group.field}
            <div class="space-y-1" class:bg-amber-50={isKeyboardCategory} class:rounded={isKeyboardCategory} class:p-1={isKeyboardCategory}>
              {#each group.values as facet, i}
                <label
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                >
                  {#if isKeyboardCategory}
                    <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[1.25rem] text-center">{getKeyboardHint(i)}</kbd>
                  {/if}
                  <input
                    type="checkbox"
                    checked={isFilterActive(group.field, facet.value)}
                    onchange={() => toggleFilter(group.field, facet.value)}
                    class="rounded border-gray-300 text-forest focus:ring-forest"
                  />
                  <span class="flex-1 capitalize">{facet.value}</span>
                  <span class="text-xs text-gray-400">{facet.count}</span>
                </label>
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <!-- Circles Facets -->
      {#if circlesWithMembers.length > 0}
        {@const isKeyboardCategory = $isFilterModeActive && $filterModeCategory === 'circles'}
        <div class="pt-2 border-t border-gray-100">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Circles
          </h4>
          <div class="space-y-1 overflow-y-auto" class:bg-amber-50={isKeyboardCategory} class:rounded={isKeyboardCategory} class:p-1={isKeyboardCategory} class:max-h-64={isKeyboardCategory}>
            <!-- No Circle option -->
            <label
              class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
            >
              {#if isKeyboardCategory}
                <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[1.25rem] text-center">1</kbd>
              {/if}
              <input
                type="checkbox"
                checked={isFilterActive('circles', 'no-circle')}
                onchange={() => toggleFilter('circles', 'no-circle')}
                class="rounded border-gray-300 text-forest focus:ring-forest"
              />
              <span class="flex-1 italic text-gray-500">No Circle</span>
            </label>
            {#each circlesWithMembers.slice(0, isKeyboardCategory ? 26 : 8) as circle, i}
              <label
                class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
              >
                {#if isKeyboardCategory}
                  <kbd class="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[1.25rem] text-center">{getKeyboardHint(i + 1)}</kbd>
                {/if}
                <input
                  type="checkbox"
                  checked={isFilterActive('circles', circle.value)}
                  onchange={() => toggleFilter('circles', circle.value)}
                  class="rounded border-gray-300 text-forest focus:ring-forest"
                />
                <CircleChip
                  circle={{ id: circle.value, name: circle.label, color: circle.color }}
                  size="sm"
                />
                <span class="text-xs text-gray-400 ml-auto">{circle.count}</span>
              </label>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
