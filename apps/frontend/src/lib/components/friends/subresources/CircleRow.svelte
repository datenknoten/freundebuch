<script lang="ts">
import CircleChip from '$lib/components/circles/CircleChip.svelte';
import type { CircleSummary } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  circle: CircleSummary;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { circle, onDelete, isDeleting = false }: Props = $props();
</script>

<!-- Mobile: Swipeable row (only swipe left for delete, no edit) -->
<div class="sm:hidden">
  <SwipeableRow onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <CircleChip {circle} size="md" />
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
      <CircleChip {circle} size="md" />
    </div>
    <DetailActions
      onDelete={onDelete}
      {isDeleting}
      deleteLabel="Remove from circle"
    />
  </div>
</div>
