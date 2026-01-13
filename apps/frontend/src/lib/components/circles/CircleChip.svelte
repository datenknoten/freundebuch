<script lang="ts">
import type { CircleSummary } from '$shared';

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
let sizeClasses = $derived(size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm');
</script>

{#if onclick}
  <!-- When clickable, use a span wrapper with button only for remove action -->
  <span
    role="button"
    tabindex="0"
    class="inline-flex items-center gap-1 rounded-full font-medium transition-opacity hover:opacity-80 cursor-pointer {sizeClasses} {textColorClass}"
    style:background-color={circle.color ?? '#e5e7eb'}
    onclick={onclick}
    onkeydown={(e) => e.key === 'Enter' && onclick?.()}
  >
    <span class="truncate max-w-[120px]">{circle.name}</span>
    {#if removable && onremove}
      <button
        type="button"
        class="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        onclick={(e) => {
          e.stopPropagation();
          onremove?.();
        }}
        aria-label="Remove {circle.name}"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </span>
{:else}
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium {sizeClasses} {textColorClass}"
    style:background-color={circle.color ?? '#e5e7eb'}
  >
    <span class="truncate max-w-[120px]">{circle.name}</span>
    {#if removable && onremove}
      <button
        type="button"
        class="ml-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        onclick={(e) => {
          e.stopPropagation();
          onremove?.();
        }}
        aria-label="Remove {circle.name}"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </span>
{/if}
