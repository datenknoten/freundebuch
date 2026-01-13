<script lang="ts">
import type { CircleSummary } from '$shared';
import CircleChip from './CircleChip.svelte';

interface Props {
  circles: CircleSummary[];
  /** Size variant for all chips */
  size?: 'sm' | 'md';
  /** Maximum number of chips to show before collapsing */
  maxVisible?: number;
  /** Whether chips are removable */
  removable?: boolean;
  /** Handler for removing a circle */
  onremove?: (circleId: string) => void;
}

let { circles, size = 'sm', maxVisible = 3, removable = false, onremove }: Props = $props();

let visibleCircles = $derived(circles.slice(0, maxVisible));
let hiddenCount = $derived(Math.max(0, circles.length - maxVisible));
let showingAll = $state(false);

let displayCircles = $derived(showingAll ? circles : visibleCircles);
</script>

{#if circles.length > 0}
  <div class="flex flex-wrap items-center gap-1">
    {#each displayCircles as circle (circle.id)}
      <CircleChip
        {circle}
        {size}
        {removable}
        onremove={onremove ? () => onremove?.(circle.id) : undefined}
      />
    {/each}

    {#if hiddenCount > 0 && !showingAll}
      <button
        type="button"
        class="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        onclick={() => (showingAll = true)}
      >
        +{hiddenCount} more
      </button>
    {:else if showingAll && hiddenCount > 0}
      <button
        type="button"
        class="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        onclick={() => (showingAll = false)}
      >
        Show less
      </button>
    {/if}
  </div>
{/if}
