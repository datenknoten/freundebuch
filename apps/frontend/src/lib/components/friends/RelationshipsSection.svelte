<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import { isOpenFriendLinkModeActive, openFriendLinkModePrefix } from '$lib/stores/ui';
import type { Relationship, RelationshipCategory, RelationshipTypeId } from '$shared';
import KeyboardHintBadge from '../KeyboardHintBadge.svelte';
import FriendAvatar from './FriendAvatar.svelte';
import { DetailEditModal, RelationshipEditForm } from './subresources';

const i18n = createI18n();

interface Props {
  /** Friend ID */
  friendId: string;
  /** Array of relationships */
  relationships: Relationship[];
  /** Starting link index for keyboard hint badges (undefined = no badges) */
  linkStartIndex?: number;
  /** IDs of friends already related (to visually indicate in add form) */
  existingRelationshipFriendIds?: string[];
}

let {
  friendId,
  relationships,
  linkStartIndex,
  existingRelationshipFriendIds = [],
}: Props = $props();

let editingRelationshipId = $state<string | null>(null);
let editNotes = $state('');
let isDeleting = $state<string | null>(null);
let isSavingNotes = $state(false);

// Add relationship modal state
let isAddingRelationship = $state(false);
let isAddLoading = $state(false);
let addError = $state<string | null>(null);
let isDirty = $state(false);
let relationshipFormRef = $state<{
  getData: () => {
    related_friend_id: string;
    relationship_type_id: RelationshipTypeId;
    notes?: string;
  };
  isValid: () => boolean;
} | null>(null);

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

// Map relationship IDs to their flat badge index (family → professional → social order)
let relationshipBadgeIndex = $derived.by(() => {
  if (linkStartIndex === undefined) return new Map<string, number>();
  const groups = groupedRelationships();
  const map = new Map<string, number>();
  let counter = 0;
  for (const category of ['family', 'professional', 'social'] as const) {
    for (const rel of groups[category]) {
      map.set(rel.id, linkStartIndex + counter);
      counter++;
    }
  }
  return map;
});

// Category colors
const categoryConfig: Record<
  RelationshipCategory,
  { labelKey: string; bgColor: string; textColor: string }
> = {
  family: {
    labelKey: 'dashboard.legend.family',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  professional: {
    labelKey: 'dashboard.legend.professional',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  social: {
    labelKey: 'dashboard.legend.social',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
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
  if (!confirm($i18n.t('relationshipSection.confirmRemove'))) {
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

// Add relationship handlers
function openAddRelationship() {
  isAddingRelationship = true;
  addError = null;
  isDirty = false;
}

function closeAddRelationship() {
  isAddingRelationship = false;
  addError = null;
  isDirty = false;
  isAddLoading = false;
}

async function handleAddRelationship() {
  if (!relationshipFormRef) return;
  if (!relationshipFormRef.isValid()) return;
  isAddLoading = true;
  addError = null;

  try {
    const data = relationshipFormRef.getData();
    await friends.addRelationship(friendId, data);
    closeAddRelationship();
  } catch (err) {
    addError = err instanceof Error ? err.message : $i18n.t('subresources.common.failedToSave');
    isAddLoading = false;
  }
}

onMount(() => {
  function handleAddRelationshipEvent() {
    openAddRelationship();
  }
  window.addEventListener('shortcut:add-relationship', handleAddRelationshipEvent);
  return () => {
    window.removeEventListener('shortcut:add-relationship', handleAddRelationshipEvent);
  };
});
</script>

{#if relationships.length > 0}
<section class="space-y-2">
  <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
    <h2 class="text-lg font-heading flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {$i18n.t('relationshipSection.relationships')}
    </h2>
    <button
      type="button"
      onclick={openAddRelationship}
      class="hidden sm:flex text-sm font-body font-semibold text-white/90 hover:text-white
             items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      {$i18n.t('relationshipSection.addRelationship')}
    </button>
  </div>

  <div class="space-y-4">
    {#each Object.entries(groupedRelationships()) as [category, rels]}
      {#if rels.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-body font-semibold {categoryConfig[category as RelationshipCategory].textColor}">
            {$i18n.t(categoryConfig[category as RelationshipCategory].labelKey)}
          </h4>

          <div class="space-y-2">
            {#each rels as relationship}
              <div class="relative">
              {#if linkStartIndex !== undefined && relationshipBadgeIndex.has(relationship.id)}
                <KeyboardHintBadge index={relationshipBadgeIndex.get(relationship.id) ?? 0} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
              {/if}
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
                        placeholder={$i18n.t('relationshipSection.addNotes')}
                      ></textarea>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          onclick={() => saveNotes(relationship.id)}
                          disabled={isSavingNotes}
                          class="text-xs text-white bg-forest px-2 py-1 rounded font-body hover:bg-forest-light disabled:opacity-50"
                        >
                          {isSavingNotes ? $i18n.t('relationshipSection.saving') : $i18n.t('relationshipSection.save')}
                        </button>
                        <button
                          type="button"
                          onclick={cancelEditing}
                          disabled={isSavingNotes}
                          class="text-xs text-gray-600 px-2 py-1 rounded font-body hover:bg-gray-200 disabled:opacity-50"
                        >
                          {$i18n.t('relationshipSection.cancel')}
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
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</section>
{/if}

{#if isAddingRelationship}
  <DetailEditModal
    title="{$i18n.t('friendDetail.modal.add')} {$i18n.t('relationshipSection.relationship')}"
    isLoading={isAddLoading}
    error={addError}
    {isDirty}
    onSave={handleAddRelationship}
    onClose={closeAddRelationship}
  >
    <RelationshipEditForm
      bind:this={relationshipFormRef}
      {friendId}
      {existingRelationshipFriendIds}
      disabled={isAddLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}
