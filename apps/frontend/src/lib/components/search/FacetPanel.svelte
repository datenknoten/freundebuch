<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { ArrayFacetField, FacetFilters, FacetGroupsResponse } from '$shared';

const i18n = createI18n();

interface Props {
  facets: FacetGroupsResponse | null;
  activeFilters: FacetFilters;
  onFilterChange: (filters: FacetFilters) => void;
  isLoading?: boolean;
}

let { facets, activeFilters, onFilterChange, isLoading = false }: Props = $props();

let expandedSections = $state<Record<string, boolean>>({
  location: true,
  professional: true,
  relationship: true,
});

function toggleSection(section: string) {
  expandedSections[section] = expandedSections[section] !== true;
}

function toggleFilter(field: ArrayFacetField, value: string) {
  const current = activeFilters[field] ?? [];
  const newValues =
    current.includes(value) === true ? current.filter((v) => v !== value) : [...current, value];

  onFilterChange({
    ...activeFilters,
    [field]: newValues.length > 0 ? newValues : undefined,
  });
}

function isFilterActive(field: ArrayFacetField, value: string) {
  return (activeFilters[field] ?? []).includes(value);
}

let hasFacets = $derived(
  facets !== null &&
    (facets.location.length > 0 ||
      facets.professional.length > 0 ||
      facets.relationship.length > 0),
);
</script>

<div class="space-y-4">
  {#if isLoading && !hasFacets}
    <!-- Loading skeleton -->
    <div class="animate-pulse space-y-3">
      <div class="h-4 bg-gray-200 rounded w-24"></div>
      <div class="h-3 bg-gray-100 rounded w-32"></div>
      <div class="h-3 bg-gray-100 rounded w-28"></div>
      <div class="h-4 bg-gray-200 rounded w-28 mt-4"></div>
      <div class="h-3 bg-gray-100 rounded w-36"></div>
      <div class="h-3 bg-gray-100 rounded w-24"></div>
    </div>
  {:else if hasFacets}
    <!-- Location Facets -->
    {#if facets && facets.location.length > 0}
      <div class="border-b border-gray-200 pb-4">
        <button
          type="button"
          onclick={() => toggleSection('location')}
          class="flex items-center justify-between w-full text-left"
        >
          <span class="font-medium text-gray-900">{$i18n.t('facets.location')}</span>
          <ChevronDown class="w-4 h-4 text-gray-500 transition-transform {expandedSections.location ? 'rotate-180' : ''}" strokeWidth="2" />
        </button>
        {#if expandedSections.location}
          <div class="mt-3 space-y-3">
            {#each facets.location as group}
              <div>
                <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {group.label}
                </h4>
                <div class="space-y-1 max-h-40 overflow-y-auto">
                  {#each group.values.slice(0, 10) as facet}
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isFilterActive(group.field, facet.value)}
                        onchange={() => toggleFilter(group.field, facet.value)}
                        class={FORM_CLASSES.checkbox}
                      />
                      <span class="text-sm text-gray-700 flex-1">{facet.value}</span>
                      <span class="text-xs text-gray-400">{facet.count}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Professional Facets -->
    {#if facets && facets.professional.length > 0}
      <div class="border-b border-gray-200 pb-4">
        <button
          type="button"
          onclick={() => toggleSection('professional')}
          class="flex items-center justify-between w-full text-left"
        >
          <span class="font-medium text-gray-900">{$i18n.t('facets.professional')}</span>
          <ChevronDown class="w-4 h-4 text-gray-500 transition-transform {expandedSections.professional ? 'rotate-180' : ''}" strokeWidth="2" />
        </button>
        {#if expandedSections.professional}
          <div class="mt-3 space-y-3">
            {#each facets.professional as group}
              <div>
                <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {group.label}
                </h4>
                <div class="space-y-1 max-h-40 overflow-y-auto">
                  {#each group.values.slice(0, 10) as facet}
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isFilterActive(group.field, facet.value)}
                        onchange={() => toggleFilter(group.field, facet.value)}
                        class={FORM_CLASSES.checkbox}
                      />
                      <span class="text-sm text-gray-700 flex-1 truncate">{facet.value}</span>
                      <span class="text-xs text-gray-400">{facet.count}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Relationship Facets -->
    {#if facets && facets.relationship.length > 0}
      <div class="pb-4">
        <button
          type="button"
          onclick={() => toggleSection('relationship')}
          class="flex items-center justify-between w-full text-left"
        >
          <span class="font-medium text-gray-900">{$i18n.t('facets.relationship')}</span>
          <ChevronDown class="w-4 h-4 text-gray-500 transition-transform {expandedSections.relationship ? 'rotate-180' : ''}" strokeWidth="2" />
        </button>
        {#if expandedSections.relationship}
          <div class="mt-3 space-y-1">
            {#each facets.relationship as group}
              {#each group.values as facet}
                <label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={isFilterActive(group.field, facet.value)}
                    onchange={() => toggleFilter(group.field, facet.value)}
                    class={FORM_CLASSES.checkbox}
                  />
                  <span class="text-sm text-gray-700 flex-1 capitalize">{facet.value}</span>
                  <span class="text-xs text-gray-400">{facet.count}</span>
                </label>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <p class="text-sm text-gray-500 italic">{$i18n.t('facets.noFilters')}</p>
  {/if}
</div>
