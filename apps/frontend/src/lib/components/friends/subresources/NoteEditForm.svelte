<script lang="ts">
import { onMount } from 'svelte';
import { listEncounters } from '$lib/api/encounters';
import { encounterDisplayTitle } from '$lib/components/encounters/encounter-display';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormSelect from '$lib/components/ui/FormSelect.svelte';
import { formClasses } from '$lib/components/ui/styles.js';
import MarkdownField from '$lib/editor/MarkdownField.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { FriendNoteInput, FriendNoteResponse, FriendSearchResultResponse } from '$shared';
import FriendSearchInput from '../FriendSearchInput.svelte';
import { noteExcerpt } from './note-excerpt';

const i18n = createI18n();

interface Props {
  initialData?: FriendNoteResponse;
  /** The friend the note is about (excluded from the source picker) */
  friendId: string;
  /** The friend's current notes, offered as supersede targets */
  notes: FriendNoteResponse[];
  disabled?: boolean;
  onchange?: () => void;
}

let { initialData, friendId, notes, disabled = false, onchange }: Props = $props();

interface Option {
  value: string;
  label: string;
}

// Form state - initialize with functions to capture initial values
let content = $state((() => initialData?.content ?? '')());
let encounterId = $state((() => initialData?.encounter?.id ?? '')());
let sourceFriend = $state<FriendSearchResultResponse | null>(
  (() => initialData?.sourceFriend ?? null)(),
);
let supersedesNoteId = $state((() => initialData?.supersedesNoteId ?? '')());
let encounterOptions = $state<Option[]>([]);

createDirtyTracker(
  () => {
    content;
    encounterId;
    sourceFriend;
    supersedesNoteId;
  },
  () => onchange,
);

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMount(async () => {
  const options: Option[] = [];
  try {
    const page = await listEncounters({ pageSize: 20 });
    for (const item of page.data) {
      options.push({
        value: item.id,
        label: `${encounterDisplayTitle($i18n.t, item)} · ${formatDate(item.encounterDate)}`,
      });
    }
  } catch (err) {
    console.error('Failed to load encounters for the note form', err);
  }
  const current = initialData?.encounter ?? null;
  if (current !== null && !options.some((option) => option.value === current.id)) {
    options.push({
      value: current.id,
      label: `${encounterDisplayTitle($i18n.t, { ...current, friends: [] })} · ${formatDate(current.encounterDate)}`,
    });
  }
  encounterOptions = options;
});

const encounterSelectOptions = $derived<Option[]>([
  { value: '', label: $i18n.t('subresources.note.noEncounter') },
  ...encounterOptions,
]);

function noteLabel(note: FriendNoteResponse): string {
  return `${noteExcerpt(note.content)} · ${formatDate(note.createdAt)}`;
}

const supersedeOptions = $derived<Option[]>([
  { value: '', label: $i18n.t('subresources.note.noSupersedes') },
  ...notes
    .filter(
      (n) =>
        n.id !== initialData?.id &&
        (n.supersededByNoteId === null || n.supersededByNoteId === initialData?.id) &&
        (initialData === undefined || n.createdAt < initialData.createdAt),
    )
    .map((n) => ({ value: n.id, label: noteLabel(n) })),
]);

export function getData(): FriendNoteInput {
  return {
    content: content.trim(),
    encounter_id: encounterId === '' ? null : encounterId,
    source_friend_id: sourceFriend?.id ?? null,
    supersedes_note_id: supersedesNoteId === '' ? null : supersedesNoteId,
  };
}

export function isValid(): boolean {
  return content.trim().length > 0;
}
</script>

<div class="space-y-4">
  <MarkdownField
    bind:value={content}
    label={$i18n.t('subresources.note.content')}
    {disabled}
    placeholder={$i18n.t('subresources.note.placeholder.content')}
  />

  <div class="space-y-2">
    <span class={formClasses.label}>{$i18n.t('subresources.note.sourceFriend')}</span>
    <FriendSearchInput
      placeholder={$i18n.t('subresources.note.sourceFriendPlaceholder')}
      excludeFriendId={friendId}
      {disabled}
      selected={sourceFriend}
      onSelect={(friend) => (sourceFriend = friend)}
      onClear={() => (sourceFriend = null)}
    />
  </div>

  <FormSelect
    id="note-encounter"
    label={$i18n.t('subresources.note.encounter')}
    bind:value={encounterId}
    options={encounterSelectOptions}
    {disabled}
  />

  <FormSelect
    id="note-supersedes"
    label={$i18n.t('subresources.note.supersedes')}
    bind:value={supersedesNoteId}
    options={supersedeOptions}
    {disabled}
  />
</div>
