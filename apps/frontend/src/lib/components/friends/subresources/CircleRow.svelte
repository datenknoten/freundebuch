<script lang="ts">
import type { CircleSummary } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  circle: CircleSummary;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { circle, onDelete, isDeleting = false }: Props = $props();

// Get contrasting text color for background
function getTextColor(hexColor: string | null): string {
  if (!hexColor) return 'text-gray-700';

  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-gray-900' : 'text-white';
}

let textColorClass = $derived(getTextColor(circle.color));
</script>

<!-- Mobile: Swipeable row (only swipe left for delete, no edit) -->
<div class="sm:hidden">
  <SwipeableRow onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {textColorClass}"
          style:background-color={circle.color ?? '#e5e7eb'}
        >
          {circle.name}
        </span>
      </div>
      <DetailActions
        onDelete={onDelete}
        {isDeleting}
        deleteLabel="Remove from circle"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {textColorClass}"
        style:background-color={circle.color ?? '#e5e7eb'}
      >
        {circle.name}
      </span>
    </div>
    <DetailActions
      onDelete={onDelete}
      {isDeleting}
      deleteLabel="Remove from circle"
    />
  </div>
</div>
