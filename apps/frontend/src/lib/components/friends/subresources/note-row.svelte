<script lang="ts">
import { encounterDisplayTitle } from '$lib/components/encounters/encounter-display';
import { chipClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { FriendNote } from '$shared';
import SubresourceRow from './subresource-row.svelte';

interface Props {
  note: FriendNote;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

let { note, onEdit, onDelete, isDeleting = false }: Props = $props();

const i18n = createI18n();

const isSuperseded = $derived(note.supersededByNoteId !== null);

const createdLabel = $derived(
  new Date(note.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
);

const encounterTitle = $derived(
  note.encounter === null ? '' : encounterDisplayTitle($i18n.t, { ...note.encounter, friends: [] }),
);
</script>

<SubresourceRow
  {onEdit}
  {onDelete}
  {isDeleting}
  editLabel={$i18n.t('subresources.note.editAria')}
  deleteLabel={$i18n.t('subresources.note.deleteAria')}
>
  <div class="flex-1 min-w-0 space-y-1">
    <p class="whitespace-pre-line font-body {isSuperseded ? 'text-gray-400' : 'text-gray-900'}">
      {note.content}
    </p>
    {#if isSuperseded}
      <span class="{chipClasses.base} {chipClasses.tint}">
        {$i18n.t('subresources.note.superseded')}
      </span>
    {/if}
    <p class="text-sm text-gray-500">
      {createdLabel}
      {#if note.sourceFriend !== null}
        ·
        <a href="/friends/{note.sourceFriend.id}" class="hover:underline">
          {$i18n.t('subresources.note.toldBy', { name: note.sourceFriend.displayName })}
        </a>
      {/if}
      {#if note.encounter !== null}
        ·
        <a href="/encounters/{note.encounter.id}" class="hover:underline">
          {$i18n.t('subresources.note.fromEncounter', { title: encounterTitle })}
        </a>
      {/if}
      {#if note.supersedesNoteId !== null}
        · {$i18n.t('subresources.note.updatesOlder')}
      {/if}
    </p>
  </div>
</SubresourceRow>
