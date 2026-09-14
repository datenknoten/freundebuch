<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { formClasses, headingClasses, surfaceClasses } from '$lib/components/ui';
import Button from '$lib/components/ui/button.svelte';
import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import {
  getKeyboardHint,
  isOpenFriendLinkModeActive,
  openFriendLinkModePrefix,
} from '$lib/stores/ui';
import {
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_CATEGORY_STYLE,
} from '$lib/utils/relationship-categories';
import type { Relationship, RelationshipCategory, RelationshipTypeId } from '$shared';
import KeyboardHintBadge from '../keyboard-hint-badge.svelte';
import FriendAvatar from './friend-avatar.svelte';
import { DetailActions, DetailEditModal, RelationshipEditForm } from './subresources';

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
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

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
  for (const category of RELATIONSHIP_CATEGORIES) {
    for (const rel of groups[category]) {
      map.set(rel.id, linkStartIndex + counter);
      counter++;
    }
  }
  return map;
});

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

function openDeleteConfirm(relationshipId: string, name: string) {
  deleteConfirmId = relationshipId;
  deleteConfirmName = name;
}

function closeDeleteConfirm() {
  deleteConfirmId = null;
  deleteConfirmName = '';
}

async function handleDelete() {
  if (deleteConfirmId === null) return;
  isDeleting = deleteConfirmId;
  try {
    await friends.deleteRelationship(friendId, deleteConfirmId);
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
  <div class={surfaceClasses.section}>
    <h2 class="{headingClasses.section} flex items-center gap-2">
      <Users class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('relationshipSection.relationships')}
    </h2>
    <div class="hidden sm:block">
      <Button variant="ghostAccent" size="xs" onclick={openAddRelationship}>
        <Plus class="w-4 h-4" strokeWidth="2" />
        {$i18n.t('relationshipSection.addRelationship')}
      </Button>
    </div>
  </div>

  <div class="space-y-4">
    {#each RELATIONSHIP_CATEGORIES as category}
      {@const rels = groupedRelationships()[category]}
      {#if rels.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-body font-semibold {RELATIONSHIP_CATEGORY_STYLE[category].textColor}">
            {$i18n.t(RELATIONSHIP_CATEGORY_STYLE[category].labelKey)}
          </h4>

          <div class="space-y-2">
            {#each rels as relationship}
              <div class="relative">
              {#if linkStartIndex !== undefined && relationshipBadgeIndex.has(relationship.id)}
                <KeyboardHintBadge index={relationshipBadgeIndex.get(relationship.id) ?? 0} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
              {/if}
              <div class="group flex items-start gap-3 p-3 {RELATIONSHIP_CATEGORY_STYLE[category].bgColor} rounded-lg">
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
                      data-shortcut={relationshipBadgeIndex.has(relationship.id)
                        ? `o ${getKeyboardHint(relationshipBadgeIndex.get(relationship.id) ?? 0)}`
                        : undefined}
                      data-shortcut-label={relationshipBadgeIndex.has(relationship.id)
                        ? 'shortcuts.panels.openLink'
                        : undefined}
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
                        class={formClasses.inputSm}
                        placeholder={$i18n.t('relationshipSection.addNotes')}
                      ></textarea>
                      <div class="flex gap-2">
                        <Button
                          size="xs"
                          loading={isSavingNotes}
                          onclick={() => saveNotes(relationship.id)}
                        >
                          {$i18n.t('relationshipSection.save')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isSavingNotes}
                          onclick={cancelEditing}
                        >
                          {$i18n.t('relationshipSection.cancel')}
                        </Button>
                      </div>
                    </div>
                  {:else if relationship.notes}
                    <p class="text-sm text-gray-600 font-body mt-1">{relationship.notes}</p>
                  {/if}
                </div>

                <DetailActions
                  onEdit={() => startEditing(relationship)}
                  onDelete={() =>
                    openDeleteConfirm(relationship.id, relationship.relatedFriendDisplayName)}
                  isDeleting={isDeleting === relationship.id}
                  editLabel={$i18n.t('aria.editNotes')}
                  deleteLabel={$i18n.t('aria.removeRelationship')}
                />
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

{#if deleteConfirmId !== null}
  <ConfirmDialog
    title={$i18n.t('relationshipSection.removeTitle')}
    description={$i18n.t('relationshipSection.confirmRemove')}
    itemPreview={deleteConfirmName}
    confirmLabel={$i18n.t('common.remove')}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
