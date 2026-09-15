<script lang="ts">
import XMark from 'svelte-heros-v2/XMark.svelte';
import { chipClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { circlesById } from '$lib/stores/circles';
import { DEFAULT_CIRCLE_COLOR } from '$lib/utils/circle-colors';
import type { Circle, CircleSummary } from '$shared';

const i18n = createI18n();

interface Props {
  circle: CircleSummary;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional click handler - if provided, makes the chip clickable */
  onclick?: () => void;
  /** Whether to show a remove button */
  removable?: boolean;
  /** Handler for remove button click */
  onremove?: () => void;
}

let { circle, size = 'sm', onclick, removable = false, onremove }: Props = $props();

// Get the path parts for this circle (ancestors + current name)
function getCirclePathParts(
  circleId: string,
  circlesMap: Map<string, Circle>,
): { ancestors: string[]; name: string } {
  const parts: string[] = [];
  let currentId: string | null = circleId;

  while (currentId) {
    const c = circlesMap.get(currentId);
    if (!c) break;
    parts.unshift(c.name);
    currentId = c.parentCircleId;
  }

  if (parts.length === 0) {
    return { ancestors: [], name: circle.name };
  }

  return {
    ancestors: parts.slice(0, -1),
    name: parts[parts.length - 1],
  };
}

let pathParts = $derived(getCirclePathParts(circle.id, $circlesById));

// Get contrasting text color for background
function getTextColor(hexColor: string | null): string {
  if (!hexColor) return 'text-gray-700';

  // Parse hex color
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'text-gray-900' : 'text-white';
}

let textColorClass = $derived(getTextColor(circle.color));
// The chip recipe with the one deviation it needs: a larger size step.
let chipClass = $derived(
  size === 'sm'
    ? chipClasses.base
    : 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-body font-medium',
);
let backgroundColor = $derived(circle.color ?? DEFAULT_CIRCLE_COLOR);
</script>

{#snippet chipContent()}
  <span class="truncate max-w-[150px]">
    {#if pathParts.ancestors.length > 0}
      <span class="opacity-60">{pathParts.ancestors.join(' ')}</span>{' '}
    {/if}<span>{pathParts.name}</span>
  </span>
  {#if removable && onremove}
    <button
      type="button"
      class="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
      onclick={(e) => {
        e.stopPropagation();
        onremove?.();
      }}
      aria-label={$i18n.t('aria.removeItem', { name: pathParts.name })}
    >
      <XMark class="w-3 h-3" strokeWidth="2" />
    </button>
  {/if}
{/snippet}

{#if onclick}
  <!-- When clickable, use a span wrapper with button only for remove action -->
  <span
    role="button"
    tabindex="0"
    class="{chipClass} {textColorClass} transition-opacity hover:opacity-80 cursor-pointer"
    style:background-color={backgroundColor}
    onclick={onclick}
    onkeydown={(e) => e.key === 'Enter' && onclick?.()}
  >
    {@render chipContent()}
  </span>
{:else}
  <span
    class="{chipClass} {textColorClass}"
    style:background-color={backgroundColor}
  >
    {@render chipContent()}
  </span>
{/if}
