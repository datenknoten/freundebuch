<script lang="ts">
import type { DateType, FriendDate } from '$shared';
import DetailActions from './DetailActions.svelte';
import SwipeableRow from './SwipeableRow.svelte';

interface Props {
  date: FriendDate;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { date, onEdit, onDelete, isDeleting = false }: Props = $props();

function formatDateType(type: DateType): string {
  const typeLabels: Record<DateType, string> = {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    other: 'Other',
  };
  return typeLabels[type] || type;
}

function formatDate(dateValue: string, yearKnown: boolean): string {
  try {
    const d = new Date(dateValue);
    if (yearKnown) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else {
      return d.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      });
    }
  } catch {
    return dateValue;
  }
}
</script>

<!-- Mobile: Swipeable row -->
<div class="sm:hidden">
  <SwipeableRow onSwipeRight={onEdit} onSwipeLeft={onDelete} disabled={isDeleting}>
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div class="flex-1 min-w-0">
        <span class="text-gray-900 font-body font-semibold">
          {formatDate(date.dateValue, date.yearKnown)}
        </span>
        <div class="text-sm text-gray-500">
          {formatDateType(date.dateType)}
          {#if date.label} - {date.label}{/if}
        </div>
      </div>
      <DetailActions
        {onEdit}
        {onDelete}
        {isDeleting}
        editLabel="Edit date"
        deleteLabel="Delete date"
      />
    </div>
  </SwipeableRow>
</div>

<!-- Desktop: Hover-revealed actions -->
<div class="hidden sm:block">
  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
    <div class="flex-1 min-w-0">
      <span class="text-gray-900 font-body font-semibold">
        {formatDate(date.dateValue, date.yearKnown)}
      </span>
      <span class="text-sm text-gray-500 ml-2">
        {formatDateType(date.dateType)}
        {#if date.label} - {date.label}{/if}
      </span>
    </div>
    <DetailActions
      {onEdit}
      {onDelete}
      {isDeleting}
      editLabel="Edit date"
      deleteLabel="Delete date"
    />
  </div>
</div>
