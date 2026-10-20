<script lang="ts">
import type { Snippet } from 'svelte';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  /** Omit for add-only types (circle, collective): they have nothing to edit. */
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  /** Accessible label for the edit action; required whenever `onEdit` is given. */
  editLabel?: string;
  /** Accessible label for the delete action; callers pass a translated string. */
  deleteLabel: string;
  children: Snippet;
}

let { onEdit, onDelete, isDeleting = false, editLabel, deleteLabel, children }: Props = $props();
</script>

{#snippet rowContent()}
  <div class={SURFACE_CLASSES.row}>
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
