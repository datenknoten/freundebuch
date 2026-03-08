<script lang="ts">
import type { Snippet } from 'svelte';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  children: Snippet;
}

let {
  onEdit,
  onDelete,
  isDeleting = false,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  children,
}: Props = $props();
</script>

{#snippet rowContent()}
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    {@render children()}
    <DetailActions {onEdit} {onDelete} {isDeleting} {editLabel} {deleteLabel} />
  </div>
{/snippet}

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    {@render rowContent()}
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  {@render rowContent()}
</div>
