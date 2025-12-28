<script lang="ts">
import { onMount } from 'svelte';
import { contacts } from '$lib/stores/contacts';
import { isModalOpen } from '$lib/stores/ui';
import type { Relationship, RelationshipCategory } from '$shared';
import AddRelationshipForm from './AddRelationshipForm.svelte';
import ContactAvatar from './ContactAvatar.svelte';

interface Props {
  /** Contact ID */
  contactId: string;
  /** Array of relationships */
  relationships: Relationship[];
}

let { contactId, relationships }: Props = $props();

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
    await contacts.updateRelationship(contactId, relationshipId, {
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
    await contacts.deleteRelationship(contactId, relationshipId);
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
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-heading text-gray-900">Relationships</h3>
    {#if !showAddForm}
      <button
        type="button"
        onclick={() => { showAddForm = true; isModalOpen.set(true); }}
        class="text-sm text-forest font-body font-semibold hover:text-forest-light"
      >
        + Add Relationship
      </button>
    {/if}
  </div>

  {#if showAddForm}
    <div class="bg-gray-50 p-4 rounded-lg">
      <AddRelationshipForm
        {contactId}
        autofocus={autofocusForm}
        onSuccess={handleAddSuccess}
        onCancel={handleAddCancel}
      />
    </div>
  {/if}

  {#if relationships.length === 0 && !showAddForm}
    <p class="text-sm text-gray-500 font-body py-4">
      No relationships yet. Add relationships to connect this contact with others.
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
                  href="/contacts/{relationship.relatedContactId}"
                  class="flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                  <ContactAvatar
                    displayName={relationship.relatedContactDisplayName}
                    photoUrl={relationship.relatedContactPhotoThumbnailUrl}
                    size="sm"
                  />
                </a>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <a
                      href="/contacts/{relationship.relatedContactId}"
                      class="font-body text-sm font-medium text-gray-900 hover:text-forest transition-colors truncate"
                    >
                      {relationship.relatedContactDisplayName}
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
