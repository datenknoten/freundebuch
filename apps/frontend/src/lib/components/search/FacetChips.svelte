<script lang="ts">
import { type ArrayFacetField, type FacetFilters, isArrayFacetField } from '$shared';

interface Props {
  filters: FacetFilters;
  onRemove: (field: ArrayFacetField, value: string) => void;
  onClearAll: () => void;
}

let { filters, onRemove, onClearAll }: Props = $props();

// Field display labels for array-type facet fields
const fieldLabels: Record<ArrayFacetField, string> = {
  country: 'Country',
  city: 'City',
  organization: 'Organization',
  job_title: 'Job Title',
  department: 'Department',
  relationship_category: 'Relationship',
  circles: 'Circle',
};

// Flatten filters into chip array (only array-type fields)
function getChips(): Array<{ field: ArrayFacetField; value: string; label: string }> {
  const result: Array<{ field: ArrayFacetField; value: string; label: string }> = [];

  for (const [field, values] of Object.entries(filters)) {
    const facetField = field as keyof FacetFilters;
    if (isArrayFacetField(facetField) && Array.isArray(values) && values.length > 0) {
      for (const value of values) {
        result.push({
          field: facetField,
          value,
          label: `${fieldLabels[facetField]}: ${value}`,
        });
      }
    }
  }
  return result;
}

let chips = $derived(getChips());
let hasFilters = $derived(chips.length > 0);
</script>

{#if hasFilters}
  <div class="flex flex-wrap gap-2 items-center">
    {#each chips as chip (chip.field + chip.value)}
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
    {/each}
    <button
      type="button"
      onclick={onClearAll}
      class="text-sm text-gray-500 hover:text-gray-700 underline"
    >
      Clear all
    </button>
  </div>
{/if}
