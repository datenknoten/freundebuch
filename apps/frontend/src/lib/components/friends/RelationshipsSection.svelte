<script lang="ts">
import { onMount } from 'svelte';
import { friends } from '$lib/stores/friends';
import { isModalOpen } from '$lib/stores/ui';
import type { Relationship, RelationshipCategory } from '$shared';
import AddRelationshipForm from './AddRelationshipForm.svelte';
import FriendAvatar from './FriendAvatar.svelte';

interface Props {
  /** Friend ID */
  friendId: string;
  /** Array of relationships */
  relationships: Relationship[];
}

let { friendId, relationships }: Props = $props();

let showAddForm = $state(false);
let autofocusForm = $state(false);

// Listen for keyboard shortcuts
onMount(() => {
  function handleAddShortcut() {
    showAddForm = true;
    autofocusForm = true;
    isModalOpen.set(true);
  }

  function handleCloseShortcut() {
    if (showAddForm) {
      showAddForm = false;
      autofocusForm = false;
    }
  }

  window.addEventListener('shortcut:add-relationship', handleAddShortcut);
  window.addEventListener('shortcut:close-modal', handleCloseShortcut);
  return () => {
    window.removeEventListener('shortcut:add-relationship', handleAddShortcut);
    window.removeEventListener('shortcut:close-modal', handleCloseShortcut);
  };
});

let editingRelationshipId = $state<string | null>(null);
let editNotes = $state('');
let isDeleting = $state<string | null>(null);
let isSavingNotes = $state(false);

// Group relationships by category
const groupedRelationships = $derived(() => {
  const groups: Record<RelationshipCategory, Relationship[]> = {
    family: [],
    professional: [],
    social: [],
  };

  for (const rel of relationships) {
    groups[rel.relationshipCategory].push(rel);
  }

  return groups;
});

// Category labels and colors
const categoryConfig: Record<
  RelationshipCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  family: { label: 'Family', bgColor: 'bg-rose-50', textColor: 'text-rose-700' },
  professional: { label: 'Professional', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  social: { label: 'Social', bgColor: 'bg-green-50', textColor: 'text-green-700' },
};

function startEditing(relationship: Relationship) {
  editingRelationshipId = relationship.id;
  editNotes = relationship.notes || '';
}

function cancelEditing() {
  editingRelationshipId = null;
  editNotes = '';
}

async function saveNotes(relationshipId: string) {
  isSavingNotes = true;
  try {
    await friends.updateRelationship(friendId, relationshipId, {
      notes: editNotes.trim() || undefined,
    });
    editingRelationshipId = null;
    editNotes = '';
  } catch {
    // Error is handled by the store
  } finally {
    isSavingNotes = false;
  }
}

async function deleteRelationship(relationshipId: string) {
  if (!confirm('Are you sure you want to remove this relationship?')) {
    return;
  }

  isDeleting = relationshipId;
  try {
    await friends.deleteRelationship(friendId, relationshipId);
  } catch {
    // Error is handled by the store
  } finally {
    isDeleting = null;
  }
}

function handleAddSuccess() {
  showAddForm = false;
  autofocusForm = false;
  isModalOpen.set(false);
}

function handleAddCancel() {
  showAddForm = false;
  autofocusForm = false;
  isModalOpen.set(false);
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleAddCancel();
  }
}
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
    <h3 class="text-lg font-heading flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Relationships
    </h3>
    <button
      type="button"
      onclick={() => { showAddForm = true; isModalOpen.set(true); }}
      class="text-sm font-body font-semibold text-white/90 hover:text-white
             flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Relationship
    </button>
  </div>

  {#if relationships.length === 0}
    <p class="text-sm text-gray-500 font-body py-4">
      No relationships yet. Add relationships to connect this friend with others.
    </p>
  {:else}
    {#each Object.entries(groupedRelationships()) as [category, rels]}
      {#if rels.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-body font-semibold {categoryConfig[category as RelationshipCategory].textColor}">
            {categoryConfig[category as RelationshipCategory].label}
          </h4>

          <div class="space-y-2">
            {#each rels as relationship}
              <div class="flex items-start gap-3 p-3 {categoryConfig[category as RelationshipCategory].bgColor} rounded-lg">
                <a
                  href="/friends/{relationship.relatedFriendId}"
                  class="flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                  <FriendAvatar
                    displayName={relationship.relatedFriendDisplayName}
                    photoUrl={relationship.relatedFriendPhotoThumbnailUrl}
                    size="sm"
                  />
                </a>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <a
                      href="/friends/{relationship.relatedFriendId}"
                      class="font-body text-sm font-medium text-gray-900 hover:text-forest transition-colors truncate"
                    >
                      {relationship.relatedFriendDisplayName}
                    </a>
                    <span class="text-xs text-gray-500 font-body">
                      ({relationship.relationshipTypeLabel})
                    </span>
                  </div>

                  {#if editingRelationshipId === relationship.id}
                    <div class="mt-2 space-y-2">
                      <textarea
                        bind:value={editNotes}
                        rows="2"
                        disabled={isSavingNotes}
                        class="w-full px-2 py-1 border border-gray-300 rounded text-sm font-body resize-none focus:ring-2 focus:ring-forest focus:border-transparent disabled:opacity-50"
                        placeholder="Add notes..."
                      ></textarea>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          onclick={() => saveNotes(relationship.id)}
                          disabled={isSavingNotes}
                          class="text-xs text-white bg-forest px-2 py-1 rounded font-body hover:bg-forest-light disabled:opacity-50"
                        >
                          {isSavingNotes ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onclick={cancelEditing}
                          disabled={isSavingNotes}
                          class="text-xs text-gray-600 px-2 py-1 rounded font-body hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  {:else if relationship.notes}
                    <p class="text-sm text-gray-600 font-body mt-1">{relationship.notes}</p>
                  {/if}
                </div>

                <div class="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onclick={() => startEditing(relationship)}
                    disabled={isDeleting === relationship.id}
                    class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-white/50 transition-colors disabled:opacity-50"
                    aria-label="Edit notes"
                    title="Edit notes"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onclick={() => deleteRelationship(relationship.id)}
                    disabled={isDeleting === relationship.id}
                    class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-white/50 transition-colors disabled:opacity-50"
                    aria-label="Remove relationship"
                    title="Remove relationship"
                  >
                    {#if isDeleting === relationship.id}
                      <div class="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    {/if}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<!-- Add Relationship Modal -->
{#if showAddForm}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-relationship-modal-title"
    tabindex="-1"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <h2 id="add-relationship-modal-title" class="text-xl font-heading text-gray-900">
          Add Relationship
        </h2>
        <button
          type="button"
          onclick={handleAddCancel}
          class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form content -->
      <div class="p-4 overflow-y-auto flex-1">
        <AddRelationshipForm
          {friendId}
          autofocus={autofocusForm}
          onSuccess={handleAddSuccess}
          onCancel={handleAddCancel}
        />
      </div>
    </div>
  </div>
{/if}
