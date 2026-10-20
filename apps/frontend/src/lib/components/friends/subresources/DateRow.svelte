<script lang="ts">
import SubresourceRow from '$lib/components/friends/subresources/SubresourceRow.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { DateType, FriendDateResponse } from '$shared';

interface Props {
  date: FriendDateResponse;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { date, onEdit, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();

function formatDate(dateValue: string, yearKnown: boolean) {
  try {
    const d = new Date(dateValue);
    if (yearKnown === true) {
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

function dateTypeLabel(type: DateType) {
  return $i18n.t(`subresources.date.types.${type}`);
}
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.date.editAria')}
  deleteLabel={$i18n.t('subresources.date.deleteAria')}
>
  <div class="flex-1 min-w-0">
    <span class="text-gray-900 font-body font-semibold">
      {formatDate(date.dateValue, date.yearKnown)}
    </span>
    <span class="text-sm text-gray-500 block sm:inline sm:ml-2">
      {dateTypeLabel(date.dateType)}
      {#if date.label} - {date.label}{/if}
    </span>
  </div>
</SubresourceRow>
