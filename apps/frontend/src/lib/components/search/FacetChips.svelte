<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import { circlesById } from '$lib/stores/circles';
import { type ArrayFacetField, type FacetFilters, isArrayFacetField } from '$shared';
import CircleChip from '../circles/CircleChip.svelte';

const i18n = createI18n();

interface Props {
  filters: FacetFilters;
  onRemove: (field: ArrayFacetField, value: string) => void;
  onClearAll: () => void;
}

let { filters, onRemove, onClearAll }: Props = $props();

// Field display labels for array-type facet fields - mapped to translation keys
const fieldLabelKeys: Record<ArrayFacetField, string> = {
  country: 'facets.fields.country',
  city: 'facets.fields.city',
  organization: 'facets.fields.organization',
  job_title: 'facets.fields.jobTitle',
  department: 'facets.fields.department',
  relationship_category: 'facets.fields.relationshipCategory',
  circles: 'facets.fields.circles',
};

// Flatten filters into chip array (only array-type fields)
function getChips(
  t: typeof $i18n.t,
): Array<{ field: ArrayFacetField; value: string; label: string }> {
  const result: Array<{ field: ArrayFacetField; value: string; label: string }> = [];

  for (const [field, values] of Object.entries(filters)) {
    const facetField = field as keyof FacetFilters;
    if (isArrayFacetField(facetField) && Array.isArray(values) && values.length > 0) {
      for (const value of values) {
        result.push({
          field: facetField,
          value,
          label: `${t(fieldLabelKeys[facetField])}: ${value}`,
        });
      }
    }
  }
  return result;
}

let chips = $derived(getChips($i18n.t));
let hasFilters = $derived(chips.length > 0);
</script>

{#if hasFilters}
  <div class="flex flex-wrap gap-2 items-center">
    {#each chips as chip (chip.field + chip.value)}
      {#if chip.field === 'circles' && chip.value !== 'no-circle'}
        {@const circle = $circlesById.get(chip.value)}
        {#if circle}
          <CircleChip
            {circle}
            size="sm"
            removable
            onremove={() => onRemove(chip.field, chip.value)}
          />
        {:else}
          <!-- Fallback if circle not found in store -->
          <button
            type="button"
            onclick={() => onRemove(chip.field, chip.value)}
            class="inline-flex items-center gap-1 px-2 py-1 bg-forest/10 text-forest text-sm rounded-full hover:bg-forest/20 transition-colors"
          >
            <span>Circle: {chip.value}</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      {:else}
        <button
          type="button"
          onclick={() => onRemove(chip.field, chip.value)}
          class="inline-flex items-center gap-1 px-2 py-1 bg-forest/10 text-forest text-sm rounded-full hover:bg-forest/20 transition-colors"
        >
          <span>{chip.label}</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      {/if}
    {/each}
    <button
      type="button"
      onclick={onClearAll}
      class="text-sm text-gray-500 hover:text-gray-700 underline"
    >
      {$i18n.t('globalSearch.clearAll')}
    </button>
  </div>
{/if}
