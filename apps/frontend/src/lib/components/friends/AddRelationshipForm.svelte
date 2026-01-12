<script lang="ts">
import { onMount } from 'svelte';
import { friends } from '$lib/stores/friends';
import type { FriendSearchResult, RelationshipTypeId, RelationshipTypesGrouped } from '$shared';
import FriendSearchInput from './FriendSearchInput.svelte';
import RelationshipTypeInput from './RelationshipTypeInput.svelte';

interface Props {
  /** Friend ID to add relationship to */
  friendId: string;
  /** Whether to autofocus the friend search input */
  autofocus?: boolean;
  /** Called when form is cancelled */
  onCancel?: () => void;
  /** Called when relationship is successfully added */
  onSuccess?: () => void;
}

let { friendId, autofocus = false, onCancel, onSuccess }: Props = $props();

let selectedFriend = $state<FriendSearchResult | null>(null);
let relationshipTypeId = $state<RelationshipTypeId>('friend');
let notes = $state('');
let isSubmitting = $state(false);
let error = $state('');
let relationshipTypes = $state<RelationshipTypesGrouped | null>(null);
let relationshipTypeContainer: HTMLDivElement;
let notesTextarea: HTMLTextAreaElement;

onMount(async () => {
  try {
    relationshipTypes = await friends.loadRelationshipTypes();
  } catch {
    error = 'Failed to load relationship types';
  }
});

function handleFriendSelect(friend: FriendSearchResult, viaKeyboard: boolean) {
  selectedFriend = friend;
  if (viaKeyboard) {
    // Activate the relationship type input after selection via keyboard
    requestAnimationFrame(() => {
      relationshipTypeContainer?.dispatchEvent(new CustomEvent('activate', { bubbles: false }));
    });
  }
}

function handleRelationshipTypeSelect(typeId: RelationshipTypeId, viaKeyboard: boolean) {
  relationshipTypeId = typeId;
  if (viaKeyboard) {
    // Focus the notes field after selection via keyboard
    requestAnimationFrame(() => {
      notesTextarea?.focus();
    });
  }
}

function clearSelectedFriend() {
  selectedFriend = null;
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!selectedFriend) {
    error = 'Please select a friend';
    return;
  }

  error = '';
  isSubmitting = true;

  try {
    await friends.addRelationship(friendId, {
      related_friend_id: selectedFriend.id,
      relationship_type_id: relationshipTypeId,
      notes: notes.trim() || undefined,
    });

    onSuccess?.();
  } catch (err) {
    error = (err as Error)?.message || 'Failed to add relationship';
  } finally {
    isSubmitting = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if error}
    <div
      class="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg font-body text-sm"
      role="alert"
    >
      {error}
    </div>
  {/if}

  <!-- Friend Selection -->
  <div class="space-y-2">
    <span id="friend-selection-label" class="block text-sm font-body font-medium text-gray-700">
      Related Friend
    </span>

    {#if selectedFriend}
      <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <span class="font-body text-sm text-gray-900">{selectedFriend.displayName}</span>
        <button
          type="button"
          onclick={clearSelectedFriend}
          class="text-gray-400 hover:text-gray-600"
          aria-label="Clear selection"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {:else}
      <FriendSearchInput
        placeholder="Search for a friend..."
        excludeFriendId={friendId}
        disabled={isSubmitting}
        {autofocus}
        onSelect={handleFriendSelect}
      />
    {/if}
  </div>

  <!-- Relationship Type -->
  <div class="space-y-2">
    <span id="relationship-type-label" class="block text-sm font-body font-medium text-gray-700">
      Relationship Type
    </span>

    <div bind:this={relationshipTypeContainer}>
      {#if relationshipTypes}
        <RelationshipTypeInput
          {relationshipTypes}
          value={relationshipTypeId}
          disabled={isSubmitting}
          onSelect={handleRelationshipTypeSelect}
        />
      {:else}
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-forest border-t-transparent"></div>
          <span>Loading relationship types...</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Notes -->
  <div class="space-y-2">
    <label for="notes" class="block text-sm font-body font-medium text-gray-700">
      Notes (optional)
    </label>
    <textarea
      id="notes"
      bind:this={notesTextarea}
      bind:value={notes}
      rows="2"
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm resize-none disabled:opacity-50"
      placeholder="Add any notes about this relationship..."
    ></textarea>
  </div>

  <!-- Form Actions -->
  <div class="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={isSubmitting || !selectedFriend || !relationshipTypes}
      class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Adding...' : 'Add Relationship'}
    </button>

    <button
      type="button"
      onclick={() => onCancel?.()}
      disabled={isSubmitting}
      class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      Cancel
    </button>
  </div>
</form>
