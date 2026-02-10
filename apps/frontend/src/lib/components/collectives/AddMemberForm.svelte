<script lang="ts">
import { autoFocus } from '$lib/actions/autoFocus';
import { searchFriends } from '$lib/api/friends';
import { createI18n } from '$lib/i18n/index.js';
import { previewMemberRelationships } from '$lib/stores/collectives';
import type { CollectiveRole, FriendSearchResult, RelationshipPreviewResponse } from '$shared';
import FriendAvatar from '../friends/FriendAvatar.svelte';
import RelationshipPreview from './RelationshipPreview.svelte';

const i18n = createI18n();

interface Props {
  collectiveId: string;
  roles: CollectiveRole[];
  /** Contact IDs of friends already in this collective (to mark them in results) */
  existingMemberContactIds?: string[];
  onAdd: (contactId: string, roleId: string, skipAutoRelationships?: boolean) => Promise<void>;
  onCancel: () => void;
}

let { collectiveId, roles, existingMemberContactIds = [], onAdd, onCancel }: Props = $props();

let existingMemberSet = $derived(new Set(existingMemberContactIds));

// Form state
let searchQuery = $state('');
let searchResults = $state<FriendSearchResult[]>([]);
let selectedFriend = $state<FriendSearchResult | null>(null);
let selectedRoleId = $state(roles[0]?.id ?? '');
let skipAutoRelationships = $state(false);
let preview = $state<RelationshipPreviewResponse | null>(null);

let isSearching = $state(false);
let isLoadingPreview = $state(false);
let isSubmitting = $state(false);
let error = $state('');
let searchDebounce: ReturnType<typeof setTimeout> | null = null;

let isValid = $derived(selectedFriend !== null && selectedRoleId !== '');

async function handleSearchInput(value: string) {
  searchQuery = value;

  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }

  if (value.trim().length < 2) {
    searchResults = [];
    return;
  }

  searchDebounce = setTimeout(async () => {
    isSearching = true;
    try {
      searchResults = await searchFriends(value.trim(), undefined, 10);
    } catch (err) {
      console.error('Search failed:', err);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }, 300);
}

async function selectFriend(friend: FriendSearchResult) {
  selectedFriend = friend;
  searchQuery = friend.displayName;
  searchResults = [];

  // Load preview
  await loadPreview();
}

function clearSelection() {
  selectedFriend = null;
  searchQuery = '';
  searchResults = [];
  preview = null;
}

async function loadPreview() {
  if (!selectedFriend || !selectedRoleId) {
    preview = null;
    return;
  }

  isLoadingPreview = true;
  try {
    preview = await previewMemberRelationships(collectiveId, {
      friend_id: selectedFriend.id,
      role_id: selectedRoleId,
    });
  } catch (err) {
    console.error('Failed to load preview:', err);
    preview = null;
  } finally {
    isLoadingPreview = false;
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
    <label for="friend-search" class="block text-sm font-body font-medium text-gray-700 mb-1">
      {$i18n.t('collectives.addMember.friendLabel')} <span class="text-red-500">*</span>
    </label>

    {#if selectedFriend}
      <!-- Selected friend display -->
      <div class="flex items-center justify-between bg-forest/5 border border-forest/20 rounded-lg p-3">
        <div class="flex items-center gap-3">
          <FriendAvatar
            displayName={selectedFriend.displayName}
            photoUrl={selectedFriend.photoThumbnailUrl}
            size="sm"
          />
          <span class="font-body text-sm text-gray-900">{selectedFriend.displayName}</span>
        </div>
        <button
          type="button"
          onclick={clearSelection}
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {:else}
      <!-- Search input -->
      <div class="relative">
        <input
          use:autoFocus
          id="friend-search"
          type="text"
          value={searchQuery}
          oninput={(e) => handleSearchInput(e.currentTarget.value)}
          placeholder={$i18n.t('collectives.addMember.searchPlaceholder')}
          disabled={isSubmitting}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body text-sm disabled:opacity-50"
        />

        {#if isSearching}
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-forest border-t-transparent"></div>
          </div>
        {/if}
      </div>

      <!-- Search results dropdown -->
      {#if searchResults.length > 0}
        <div class="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {#each searchResults as friend (friend.id)}
            {@const isMember = existingMemberSet.has(friend.id)}
            <button
              type="button"
              onclick={() => !isMember && selectFriend(friend)}
              disabled={isMember}
              class="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left {isMember ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}"
            >
              <FriendAvatar
                displayName={friend.displayName}
                photoUrl={friend.photoThumbnailUrl}
                size="sm"
              />
              <span class="font-body text-sm {isMember ? 'text-gray-500' : 'text-gray-900'}">{friend.displayName}</span>
              {#if isMember}
                <span class="ml-auto text-xs text-gray-400 font-body italic">{$i18n.t('collectives.addMember.alreadyMember')}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
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
