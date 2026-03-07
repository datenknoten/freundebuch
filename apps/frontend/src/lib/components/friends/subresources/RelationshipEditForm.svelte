<script lang="ts">
import { onMount } from 'svelte';
import { createDirtyTracker, FormTextarea, formClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult, RelationshipTypeId, RelationshipTypesGrouped } from '$shared';
import FriendSearchInput from '../FriendSearchInput.svelte';
import RelationshipTypeInput from '../RelationshipTypeInput.svelte';

const i18n = createI18n();

interface Props {
  /** Friend ID (used to exclude self from search) */
  friendId: string;
  /** IDs of friends already related (to visually indicate) */
  existingRelationshipFriendIds?: string[];
  disabled?: boolean;
  onchange?: () => void;
}

let { friendId, existingRelationshipFriendIds = [], disabled = false, onchange }: Props = $props();

let selectedFriend = $state<FriendSearchResult | null>(null);
let relationshipTypeId = $state<RelationshipTypeId>('friend');
let notes = $state('');
let relationshipTypes = $state<RelationshipTypesGrouped | null>(null);
let loadError = $state('');
let relationshipTypeContainer: HTMLDivElement;
let notesTextarea: HTMLTextAreaElement;

onMount(async () => {
  try {
    relationshipTypes = await friends.loadRelationshipTypes();
  } catch {
    loadError = $i18n.t('relationshipSection.failedToLoadTypes');
  }
});

createDirtyTracker(
  () => {
    selectedFriend;
    relationshipTypeId;
    notes;
  },
  () => onchange,
);

function handleFriendSelect(friend: FriendSearchResult, viaKeyboard: boolean) {
  selectedFriend = friend;
  if (viaKeyboard) {
    requestAnimationFrame(() => {
      relationshipTypeContainer?.dispatchEvent(new CustomEvent('activate', { bubbles: false }));
    });
  }
}

function handleRelationshipTypeSelect(typeId: RelationshipTypeId, viaKeyboard: boolean) {
  relationshipTypeId = typeId;
  if (viaKeyboard) {
    requestAnimationFrame(() => {
      notesTextarea?.focus();
    });
  }
}

function clearSelectedFriend() {
  selectedFriend = null;
}

export function getData(): {
  related_friend_id: string;
  relationship_type_id: RelationshipTypeId;
  notes?: string;
} {
  return {
    related_friend_id: selectedFriend!.id,
    relationship_type_id: relationshipTypeId,
    notes: notes.trim() || undefined,
  };
}

export function isValid(): boolean {
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
    <span class={formClasses.label}>
      {$i18n.t('relationshipSection.relatedFriend')} <span class="text-red-500">*</span>
    </span>

    {#if selectedFriend}
      <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <span class="font-body text-sm text-gray-900">{selectedFriend.displayName}</span>
        <button
          type="button"
          onclick={clearSelectedFriend}
          {disabled}
          class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          aria-label={$i18n.t('common.clear')}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {:else}
      <FriendSearchInput
        placeholder={$i18n.t('relationshipSection.searchPlaceholder')}
        excludeFriendId={friendId}
        {disabled}
        autofocus={true}
        onSelect={handleFriendSelect}
      />
    {/if}
  </div>

  <!-- Relationship Type -->
  <div class="space-y-2">
    <span class={formClasses.label}>
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
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-forest border-t-transparent"></div>
          <span>{$i18n.t('relationshipSection.loadingTypes')}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Notes -->
  <div class="space-y-2">
    <label for="relationship-notes" class={formClasses.label}>
      {$i18n.t('relationshipSection.notesOptional')}
    </label>
    <textarea
      id="relationship-notes"
      bind:this={notesTextarea}
      bind:value={notes}
      rows="2"
      {disabled}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none disabled:opacity-50"
      placeholder={$i18n.t('relationshipSection.notesPlaceholder')}
    ></textarea>
  </div>
</div>
