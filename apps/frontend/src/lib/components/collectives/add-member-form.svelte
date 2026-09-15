<script lang="ts">
import { Button, FormCheckbox, FormSelect, formClasses, Spinner } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import { previewMemberRelationships } from '$lib/stores/collectives';
import type { CollectiveRole, FriendSearchResult, RelationshipPreviewResponse } from '$shared';
import AlertBanner from '../alert-banner.svelte';
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
let roleOptions = $derived(
  [...roles]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((role) => ({ value: role.id, label: role.label })),
);
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

function handleFriendSelect(friend: FriendSearchResult, _viaKeyboard: boolean) {
  selectedFriend = friend;
}

function clearSelection() {
  selectedFriend = null;
}

async function loadPreview(friend: FriendSearchResult, roleId: string) {
  previewAbortController?.abort();
  previewAbortController = new AbortController();
  const signal = previewAbortController.signal;

  isLoadingPreview = true;
  try {
    const result = await previewMemberRelationships(
      collectiveId,
      { friend_id: friend.id, role_id: roleId },
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

// The preview depends on both the friend and the role, so it is derived from
// them rather than reloaded from each control's change handler.
$effect(() => {
  const friend = selectedFriend;
  const roleId = selectedRoleId;

  if (friend === null || roleId === '') {
    preview = null;
    return;
  }

  void loadPreview(friend, roleId);
});

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
    error =
      err instanceof Error && err.message.length > 0
        ? err.message
        : $i18n.t('collectives.addMember.error');
  } finally {
    isSubmitting = false;
  }
}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  {#if error.length > 0}
    <AlertBanner variant="error">{error}</AlertBanner>
  {/if}

  <!-- Friend search -->
  <div>
    <label for="member-search" class={formClasses.label}>
      {$i18n.t('collectives.addMember.friendLabel')} <span class="text-red-500" aria-hidden="true">*</span>
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
  <FormSelect
    id="role"
    label={$i18n.t('collectives.addMember.roleLabel')}
    bind:value={selectedRoleId}
    options={roleOptions}
    disabled={isSubmitting}
    size="sm"
    required
  />

  <!-- Relationship preview -->
  {#if selectedFriend && selectedRoleId}
    <div>
      <h4 class="text-sm font-body font-medium text-gray-700 mb-2">
        {$i18n.t('collectives.addMember.relationshipPreview')}
      </h4>

      {#if isLoadingPreview}
        <div class="flex justify-center py-4">
          <Spinner size="md" />
        </div>
      {:else if preview}
        <RelationshipPreview {preview} />

        <!-- Skip auto-relationships checkbox (only when there are new relationships to create) -->
        {#if preview.relationships.some((r) => !r.alreadyExists)}
          <div class="mt-3">
            <FormCheckbox
              id="skip-relationships"
              label={$i18n.t('collectives.addMember.skipRelationships')}
              bind:checked={skipAutoRelationships}
            />
          </div>
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
    <Button
      type="submit"
      class="flex-1"
      loading={isSubmitting}
      disabled={!isValid}
    >
      {$i18n.t('collectives.addMember.submit')}
    </Button>

    <Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
      {$i18n.t('collectives.form.cancel')}
    </Button>
  </div>
</form>
