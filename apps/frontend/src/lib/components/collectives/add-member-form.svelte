<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import { previewMemberRelationships } from '$lib/stores/collectives';
import type { CollectiveRole, FriendSearchResult, RelationshipPreviewResponse } from '$shared';
import FriendSearchInput from '../friends/friend-search-input.svelte';
import RelationshipPreview from './relationship-preview.svelte';

const i18n = createI18n();

interface Props {
  collectiveId: string;
  collectiveName: string;
  roles: CollectiveRole[];
  /** Contact IDs of friends already in this collective (to mark them in results) */
  existingMemberContactIds?: string[];
  onAdd: (contactId: string, roleId: string, skipAutoRelationships?: boolean) => Promise<void>;
  onCancel: () => void;
}

let {
  collectiveId,
  collectiveName,
  roles,
  existingMemberContactIds = [],
  onAdd,
  onCancel,
}: Props = $props();

let existingMemberSet = $derived(new Set(existingMemberContactIds));

// Form state
let selectedFriend = $state<FriendSearchResult | null>(null);
let selectedRoleId = $state(roles[0]?.id ?? '');
let skipAutoRelationships = $state(false);
let preview = $state<RelationshipPreviewResponse | null>(null);

let isLoadingPreview = $state(false);
let isSubmitting = $state(false);
let error = $state('');
let previewAbortController: AbortController | null = null;

let isValid = $derived(selectedFriend !== null && selectedRoleId !== '');

// Link to create a brand-new friend, carrying the collective context along
let createNewFriendHref = $derived.by(() => {
  const params = new URLSearchParams({
    collectiveId,
    collectiveName,
  });
  if (selectedRoleId) params.set('roleId', selectedRoleId);
  return `/friends/new?${params.toString()}`;
});

async function handleFriendSelect(friend: FriendSearchResult, _viaKeyboard: boolean) {
  selectedFriend = friend;

  // Load preview
  await loadPreview();
}

function clearSelection() {
  selectedFriend = null;
  preview = null;
}

async function loadPreview() {
  if (!selectedFriend || !selectedRoleId) {
    preview = null;
    return;
  }

  previewAbortController?.abort();
  previewAbortController = new AbortController();
  const signal = previewAbortController.signal;

  isLoadingPreview = true;
  try {
    const result = await previewMemberRelationships(
      collectiveId,
      { friend_id: selectedFriend.id, role_id: selectedRoleId },
      { signal },
    );
    if (!signal.aborted) preview = result;
  } catch (err) {
    if (!signal.aborted) {
      console.error('Failed to load preview:', err);
      preview = null;
    }
  } finally {
    if (!signal.aborted) isLoadingPreview = false;
  }
}

async function handleRoleChange(e: Event) {
  const select = e.target as HTMLSelectElement;
  selectedRoleId = select.value;

  if (selectedFriend) {
    await loadPreview();
  }
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!isValid || !selectedFriend) {
    error = $i18n.t('collectives.addMember.validationError');
    return;
  }

  error = '';
  isSubmitting = true;

  try {
    await onAdd(selectedFriend.id, selectedRoleId, skipAutoRelationships);
  } catch (err) {
    error = (err as Error)?.message || $i18n.t('collectives.addMember.error');
  } finally {
    isSubmitting = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if error}
    <div
      class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm"
      role="alert"
    >
      {error}
    </div>
  {/if}

  <!-- Friend search -->
  <div>
    <label for="member-search" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('collectives.addMember.friendLabel')} <span class="text-red-500">*</span>
    </label>

    <FriendSearchInput
      id="member-search"
      placeholder={$i18n.t('collectives.addMember.searchPlaceholder')}
      disabled={isSubmitting}
      autofocus
      selected={selectedFriend}
      disabledCheck={(friend) =>
        existingMemberSet.has(friend.id)
          ? $i18n.t('collectives.addMember.alreadyMember')
          : null
      }
      onSelect={handleFriendSelect}
      onClear={clearSelection}
    />
    {#if !selectedFriend}
      <a
        href={createNewFriendHref}
        class="inline-block mt-2 text-sm text-forest hover:text-forest-light font-body underline"
      >
        {$i18n.t('collectives.addMember.createNewFriend')}
      </a>
    {/if}
  </div>

  <!-- Role select -->
  <div>
    <label for="role" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('collectives.addMember.roleLabel')} <span class="text-red-500">*</span>
    </label>
    <select
      id="role"
      value={selectedRoleId}
      onchange={handleRoleChange}
      disabled={isSubmitting}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
    >
      {#each roles.sort((a, b) => a.sortOrder - b.sortOrder) as role (role.id)}
        <option value={role.id}>{role.label}</option>
      {/each}
    </select>
  </div>

  <!-- Relationship preview -->
  {#if selectedFriend && selectedRoleId}
    <div>
      <h4 class="text-sm font-body font-medium text-gray-700 mb-2">
        {$i18n.t('collectives.addMember.relationshipPreview')}
      </h4>

      {#if isLoadingPreview}
        <div class="flex justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-forest border-t-transparent"></div>
        </div>
      {:else if preview}
        <RelationshipPreview {preview} />

        <!-- Skip auto-relationships checkbox (only when there are new relationships to create) -->
        {#if preview.relationships.some((r) => !r.alreadyExists)}
          <label class="mt-3 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={skipAutoRelationships}
              class="rounded border-gray-300 text-forest focus:ring-forest"
            />
            <span class="text-sm text-gray-600 font-body">
              {$i18n.t('collectives.addMember.skipRelationships')}
            </span>
          </label>
        {/if}
      {:else}
        <p class="text-sm text-gray-500 font-body italic py-2">
          {$i18n.t('collectives.addMember.noRelationships')}
        </p>
      {/if}
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={isSubmitting || !isValid}
      class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isSubmitting}
        <span class="inline-flex items-center gap-2">
          <span class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          {$i18n.t('collectives.addMember.adding')}
        </span>
      {:else}
        {$i18n.t('collectives.addMember.submit')}
      {/if}
    </button>

    <button
      type="button"
      onclick={onCancel}
      disabled={isSubmitting}
      class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {$i18n.t('collectives.form.cancel')}
    </button>
  </div>
</form>
