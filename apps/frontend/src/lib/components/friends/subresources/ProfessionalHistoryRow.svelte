<script lang="ts">
import SubresourceRow from '$lib/components/friends/subresources/SubresourceRow.svelte';
import { CHIP_CLASSES } from '$lib/components/ui/chip-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type { ProfessionalHistoryResponse } from '$shared';

interface Props {
  history: ProfessionalHistoryResponse;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { history, onEdit, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();

/**
 * Month names come from Intl rather than a hard-coded table, so a German UI reads
 * "Mai 2019" instead of "May 2019". `undefined` defers to the runtime locale, matching
 * the sibling rows (and the `withDefaultLocale` test helper).
 */
function formatMonthYear(month: number, year: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateRange() {
  const from = formatMonthYear(history.fromMonth, history.fromYear);
  const to =
    history.toMonth !== null &&
    history.toMonth !== 0 &&
    history.toYear !== null &&
    history.toYear !== 0
      ? formatMonthYear(history.toMonth, history.toYear)
      : $i18n.t('subresources.employment.present');
  return `${from} - ${to}`;
}

function getMainText() {
  if (
    history.jobTitle !== undefined &&
    history.jobTitle !== '' &&
    history.organization !== undefined &&
    history.organization !== ''
  ) {
    return $i18n.t('subresources.employment.atOrganization', {
      jobTitle: history.jobTitle,
      organization: history.organization,
    });
  }
  if (history.jobTitle !== undefined && history.jobTitle !== '') {
    return history.jobTitle;
  }
  if (history.organization !== undefined && history.organization !== '') {
    return history.organization;
  }
  return $i18n.t('subresources.employment.untitled');
}

function getSubText() {
  const parts: string[] = [];
  if (history.department !== undefined && history.department !== '') {
    parts.push(history.department);
  }
  parts.push(formatDateRange());
  return parts.join(' | ');
}
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.employment.editAria')}
  deleteLabel={$i18n.t('subresources.employment.deleteAria')}
>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <span class="text-gray-900 font-body font-semibold truncate">
        {getMainText()}
      </span>
      {#if history.isPrimary}
        <span class="{CHIP_CLASSES.base} {CHIP_CLASSES.tint}">
          {$i18n.t('subresources.common.primary')}
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
</SubresourceRow>
