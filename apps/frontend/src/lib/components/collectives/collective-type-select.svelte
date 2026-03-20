<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { collectives, collectiveTypes } from '$lib/stores/collectives';
import type { CollectiveType } from '$shared';

const i18n = createI18n();

interface Props {
  /** Currently selected type ID */
  value?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Called when selection changes */
  onChange?: (type: CollectiveType | null) => void;
}

let { value, placeholder, disabled = false, onChange }: Props = $props();

let types = $derived($collectiveTypes);
let isLoading = $derived($collectives.isLoadingTypes);

// Load types on mount if not already loaded
onMount(async () => {
  if (types.length === 0) {
    await collectives.loadTypes();
  }
});

function handleChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  const selectedId = select.value;

  if (selectedId) {
    const selectedType = types.find((t) => t.id === selectedId);
    onChange?.(selectedType ?? null);
  } else {
    onChange?.(null);
  }
}
</script>

<select
  {value}
  onchange={handleChange}
  disabled={disabled || isLoading}
  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
>
  {#if placeholder}
    <option value="">{placeholder}</option>
  {/if}

  {#if isLoading}
    <option value="" disabled>{$i18n.t('collectives.loadingTypes')}</option>
  {:else}
    {#each types as type (type.id)}
      <option value={type.id}>{type.name}</option>
    {/each}
  {/if}
</select>
