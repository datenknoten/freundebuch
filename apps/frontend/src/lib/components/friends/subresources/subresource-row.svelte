<script lang="ts">
import type { Snippet } from 'svelte';
import DetailActions from './detail-actions.svelte';
import SwipeableRow from './swipeable-row.svelte';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Accessible label for the edit action; callers pass a translated string. */
  editLabel: string;
  /** Accessible label for the delete action; callers pass a translated string. */
  deleteLabel: string;
  children: Snippet;
}

let { onEdit, onDelete, isDeleting = false, editLabel, deleteLabel, children }: Props = $props();
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
