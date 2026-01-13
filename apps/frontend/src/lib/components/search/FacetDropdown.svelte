<script lang="ts">
import {
  type ArrayFacetField,
  type FacetFilters,
  type FacetGroups,
  isArrayFacetField,
} from '$shared';

interface Props {
  facets: FacetGroups | null;
  activeFilters: FacetFilters;
  onFilterChange: (filters: FacetFilters) => void;
  isLoading?: boolean;
}

let { facets, activeFilters, onFilterChange, isLoading = false }: Props = $props();
let isOpen = $state(false);

// Count total active filters (only array-type fields)
let activeCount = $derived(
  Object.entries(activeFilters).reduce((sum, [field, value]) => {
    if (isArrayFacetField(field as keyof FacetFilters) && Array.isArray(value)) {
      return sum + value.length;
    }
    return sum;
  }, 0),
);

// Check if facets are available
let hasFacets = $derived(
  facets &&
    (facets.location.length > 0 ||
      facets.professional.length > 0 ||
      facets.relationship.length > 0),
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
            <div class="mb-2">
              <span class="text-xs text-gray-400">{group.label}</span>
              <div class="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {#each group.values.slice(0, 8) as facet}
                  <label
                    class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                  >
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
            <div class="mb-2">
              <span class="text-xs text-gray-400">{group.label}</span>
              <div class="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {#each group.values.slice(0, 8) as facet}
                  <label
                    class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                  >
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
            <div class="space-y-1">
              {#each group.values as facet}
                <label
                  class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                >
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
    </div>
  {/if}
</div>
