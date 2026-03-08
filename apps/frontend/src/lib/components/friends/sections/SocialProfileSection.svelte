<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import { isOpenFriendLinkModeActive, openFriendLinkModePrefix } from '$lib/stores/ui';
import type { SocialProfile, SocialProfileInput } from '$shared';
import KeyboardHintBadge from '../../KeyboardHintBadge.svelte';
import {
  DeleteConfirmModal,
  DetailEditModal,
  SocialProfileEditForm,
  SocialProfileRow,
} from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  socialProfiles: SocialProfile[];
  linkStartIndex?: number;
}

let { friendId, socialProfiles, linkStartIndex }: Props = $props();

let editingId = $state<string | null>(null);
let editingData = $state<SocialProfile | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => SocialProfileInput; isValid: () => boolean } | null>(null);

let deletingId = $state<string | null>(null);
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

let showModal = $derived(isAdding || editingId !== null);

// Map social profile IDs to their badge index (only profiles with profileUrl)
let socialProfileBadgeIndex = $derived.by(() => {
  if (linkStartIndex === undefined) return new Map<string, number>();
  const map = new Map<string, number>();
  let offset = 0;
  for (const profile of socialProfiles) {
    if (profile.profileUrl) {
      map.set(profile.id, linkStartIndex + offset);
      offset++;
    }
  }
  return map;
});

function openAdd() {
  editingId = null;
  editingData = null;
  isAdding = true;
  editError = null;
  isDirty = false;
}

function openEdit(profile: SocialProfile) {
  editingId = profile.id;
  editingData = profile;
  isAdding = false;
  editError = null;
  isDirty = false;
}

function closeModal() {
  editingId = null;
  editingData = null;
  isAdding = false;
  editError = null;
  isDirty = false;
  isEditLoading = false;
}

async function handleSave() {
  if (!formRef) return;
  if (!formRef.isValid()) return;
  isEditLoading = true;
  editError = null;

  try {
    const data = formRef.getData();
    if (editingId) {
      await friends.updateSocialProfile(friendId, editingId, data);
    } else {
      await friends.addSocialProfile(friendId, data);
    }
    closeModal();
  } catch (err) {
    editError = err instanceof Error ? err.message : 'Failed to save';
    isEditLoading = false;
  }
}

function openDeleteConfirm(id: string, name: string) {
  deleteConfirmId = id;
  deleteConfirmName = name;
}

function closeDeleteConfirm() {
  deleteConfirmId = null;
  deleteConfirmName = '';
}

async function handleDelete() {
  if (!deleteConfirmId) return;
  deletingId = deleteConfirmId;
  try {
    await friends.deleteSocialProfile(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddSocial() {
    openAdd();
  }
  window.addEventListener('shortcut:add-social', handleAddSocial);
  return () => {
    window.removeEventListener('shortcut:add-social', handleAddSocial);
  };
});
</script>

{#if socialProfiles.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>
        {$i18n.t('friendDetail.sections.socialProfiles')}
      </h2>
      <button
        type="button"
        onclick={openAdd}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {$i18n.t('friendDetail.actions.addSocial')}
      </button>
    </div>
    <div class="space-y-2">
      {#each socialProfiles as profile (profile.id)}
        <div class="relative">
          {#if socialProfileBadgeIndex.has(profile.id)}
            <KeyboardHintBadge index={socialProfileBadgeIndex.get(profile.id) ?? 0} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
          {/if}
          <SocialProfileRow
            {profile}
            onEdit={() => openEdit(profile)}
            onDelete={() => openDeleteConfirm(profile.id, profile.username || profile.profileUrl || profile.platform)}
            isDeleting={deletingId === profile.id}
          />
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title="{editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.socialProfile')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <SocialProfileEditForm
      bind:this={formRef}
      initialData={editingData ?? undefined}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title="Delete Social Profile"
    description="Are you sure you want to delete this social profile?"
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
