<script lang="ts">
import { onMount } from 'svelte';
import { circles, circlesList } from '$lib/stores/circles';
import type { Circle, CircleSummary } from '$shared';

interface Props {
  /** Circles the friend is already assigned to (to exclude from selection) */
  existingCircles?: CircleSummary[];
  disabled?: boolean;
  onchange?: () => void;
}

let { existingCircles = [], disabled = false, onchange }: Props = $props();

// Form state
let selectedCircleId = $state('');

// Load circles on mount if not already loaded
onMount(() => {
  if ($circles.circles.length === 0) {
    circles.loadCircles();
  }
});

// Get available circles (exclude already assigned ones)
let existingCircleIds = $derived(new Set(existingCircles.map((c) => c.id)));
let availableCircles = $derived($circlesList.filter((c) => !existingCircleIds.has(c.id)));

// Skip initial effect run
let initialized = false;

// Call onchange when selection changes
$effect(() => {
  selectedCircleId;
  if (initialized) {
    onchange?.();
  } else {
    initialized = true;
  }
});

// Get contrasting text color for background
function getTextColor(hexColor: string | null): string {
  if (!hexColor) return '#374151'; // gray-700

  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
}

export function getData(): { circleId: string } {
  return {
    circleId: selectedCircleId,
  };
}

export function isValid(): boolean {
  return selectedCircleId.length > 0;
}

export function getSelectedCircle(): Circle | undefined {
  return availableCircles.find((c) => c.id === selectedCircleId);
}
</script>

<div class="space-y-4">
  {#if $circles.isLoading}
    <div class="flex items-center gap-2 text-gray-500 font-body">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Loading circles...
    </div>
  {:else if availableCircles.length === 0}
    <div class="text-gray-500 font-body">
      {#if $circlesList.length === 0}
        <p>No circles created yet.</p>
        <p class="text-sm mt-1">Create circles in the Circles management page to organize your friends.</p>
      {:else}
        <p>This friend is already in all available circles.</p>
      {/if}
    </div>
  {:else}
    <div>
      <label for="circle-select" class="block text-sm font-body font-medium text-gray-700 mb-1">
        Select Circle <span class="text-red-500">*</span>
      </label>
      <select
        id="circle-select"
        bind:value={selectedCircleId}
        {disabled}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent
               font-body disabled:opacity-50 disabled:cursor-not-allowed"
        required
      >
        <option value="">Choose a circle...</option>
        {#each availableCircles as circle (circle.id)}
          <option value={circle.id}>{circle.name}</option>
        {/each}
      </select>
    </div>

    <!-- Preview of selected circle -->
    {#if selectedCircleId}
      {@const selectedCircle = availableCircles.find((c) => c.id === selectedCircleId)}
      {#if selectedCircle}
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 font-body">Preview:</span>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style:background-color={selectedCircle.color ?? '#e5e7eb'}
            style:color={getTextColor(selectedCircle.color)}
          >
            {selectedCircle.name}
          </span>
        </div>
      {/if}
    {/if}
  {/if}
</div>
