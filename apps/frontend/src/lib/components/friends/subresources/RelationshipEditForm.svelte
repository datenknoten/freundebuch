<script lang="ts">
import { onMount } from 'svelte';
import type { RelationshipCreateData } from '$lib/api/friend-details.js';
import { getAppContext } from '$lib/app-context.js';
import FriendSearchInput from '$lib/components/friends/FriendSearchInput.svelte';
import RelationshipTypeInput from '$lib/components/friends/RelationshipTypeInput.svelte';
import { createDirtyTracker } from '$lib/components/ui/dirty-tracker.svelte.js';
import FormTextarea from '$lib/components/ui/FormTextarea.svelte';
import { FORM_CLASSES } from '$lib/components/ui/form-classes.js';
import Spinner from '$lib/components/ui/Spinner.svelte';
import { InvariantError } from '$lib/errors/invariant.error.js';
import { createI18n } from '$lib/i18n/i18n.js';
import type {
  FriendSearchResultResponse,
  RelationshipTypeId,
  RelationshipTypesGroupedResponse,
} from '$shared';

const i18n = createI18n();
const friends = getAppContext().stores.friends;

interface Props {
  /** Friend ID (used to exclude self from search) */
  friendId: string;
  /** IDs of friends already related (to visually indicate) */
  existingRelationshipFriendIds?: string[];
  disabled?: boolean;
  onchange?: () => void;
}

let { friendId, disabled = false, onchange }: Props = $props();

let selectedFriend = $state<FriendSearchResultResponse | null>(null);
let relationshipTypeId = $state<RelationshipTypeId>('friend');
let notes = $state('');
let relationshipTypes = $state<RelationshipTypesGroupedResponse | null>(null);
let loadError = $state('');
let relationshipTypeContainer: HTMLDivElement;

async function loadRelationshipTypes() {
  try {
    relationshipTypes = await friends.loadRelationshipTypes();
  } catch {
    loadError = $i18n.t('relationshipSection.failedToLoadTypes');
  }
}

onMount(loadRelationshipTypes);

function trackDirtyFields() {
  selectedFriend;
  relationshipTypeId;
  notes;
}

createDirtyTracker(trackDirtyFields, () => onchange);

function handleFriendSelect(friend: FriendSearchResultResponse, viaKeyboard: boolean) {
  selectedFriend = friend;
  if (viaKeyboard === true) {
    requestAnimationFrame(activateRelationshipTypeInput);
  }
}

function activateRelationshipTypeInput() {
  relationshipTypeContainer?.dispatchEvent(new CustomEvent('activate', { bubbles: false }));
}

function focusNotes() {
  document.getElementById('relationship-notes')?.focus();
}

function handleRelationshipTypeSelect(typeId: RelationshipTypeId, viaKeyboard: boolean) {
  relationshipTypeId = typeId;
  if (viaKeyboard === true) {
    requestAnimationFrame(focusNotes);
  }
}

function clearSelectedFriend() {
  selectedFriend = null;
}

export function getData() {
  if (selectedFriend === null) {
    throw new InvariantError(
      'getData() called without a selected friend; guard with isValid() first',
    );
  }
  const trimmedNotes = notes.trim();
  return {
    relatedFriendId: selectedFriend.id,
    relationshipTypeId,
    notes: trimmedNotes === '' ? undefined : trimmedNotes,
  } satisfies RelationshipCreateData;
}

export function isValid() {
  return selectedFriend !== null && relationshipTypes !== null;
}
</script>

<div class="space-y-4">
  {#if loadError}
    <div
      class="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg font-body text-sm"
      role="alert"
    >
      {loadError}
    </div>
  {/if}

  <!-- Friend Selection -->
  <div class="space-y-2">
    <span class={FORM_CLASSES.label}>
      {$i18n.t('relationshipSection.relatedFriend')} <span class="text-red-500">*</span>
    </span>

    <FriendSearchInput
      placeholder={$i18n.t('relationshipSection.searchPlaceholder')}
      excludeFriendId={friendId}
      {disabled}
      autofocus={true}
      selected={selectedFriend}
      onSelect={handleFriendSelect}
      onClear={clearSelectedFriend}
    />
  </div>

  <!-- Relationship Type -->
  <div class="space-y-2">
    <span class={FORM_CLASSES.label}>
      {$i18n.t('relationshipSection.relationshipType')} <span class="text-red-500">*</span>
    </span>

    <div bind:this={relationshipTypeContainer}>
      {#if relationshipTypes}
        <RelationshipTypeInput
          {relationshipTypes}
          value={relationshipTypeId}
          {disabled}
          onSelect={handleRelationshipTypeSelect}
        />
      {:else if !loadError}
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" tone="current" />
          <span>{$i18n.t('relationshipSection.loadingTypes')}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Notes -->
  <FormTextarea
    id="relationship-notes"
    label={$i18n.t('relationshipSection.notesOptional')}
    bind:value={notes}
    rows={2}
    {disabled}
    size="sm"
    placeholder={$i18n.t('relationshipSection.notesPlaceholder')}
  />
</div>
