<script lang="ts">
import type { ProfessionalHistory } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  history: ProfessionalHistory;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { history, onEdit, onDelete, isDeleting = false }: Props = $props();

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDateRange(): string {
  const from = `${monthNames[history.fromMonth - 1]} ${history.fromYear}`;
  const to =
    history.toMonth && history.toYear
      ? `${monthNames[history.toMonth - 1]} ${history.toYear}`
      : 'Present';
  return `${from} - ${to}`;
}

function getMainText(): string {
  if (history.jobTitle && history.organization) {
    return `${history.jobTitle} at ${history.organization}`;
  }
  return history.jobTitle || history.organization || 'Employment';
}

function getSubText(): string {
  const parts: string[] = [];
  if (history.department) {
    parts.push(history.department);
  }
  parts.push(formatDateRange());
  return parts.join(' | ');
}
</script>

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-gray-900 font-body font-semibold truncate">
            {getMainText()}
          </span>
          {#if history.isPrimary}
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forest/10 text-forest">
              Primary
            </span>
          {/if}
        </div>
        <div class="text-sm text-gray-500">
          {getSubText()}
        </div>
        {#if history.notes}
          <div class="text-sm text-gray-400 mt-1 truncate">
            {history.notes}
          </div>
        {/if}
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit employment"
        deleteLabel="Delete employment"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-gray-900 font-body font-semibold">
          {getMainText()}
        </span>
        {#if history.isPrimary}
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forest/10 text-forest">
            Primary
          </span>
        {/if}
      </div>
      <span class="text-sm text-gray-500">
        {getSubText()}
      </span>
      {#if history.notes}
        <div class="text-sm text-gray-400 mt-1">
          {history.notes}
        </div>
      {/if}
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit employment"
      deleteLabel="Delete employment"
    />
  </div>
</div>
