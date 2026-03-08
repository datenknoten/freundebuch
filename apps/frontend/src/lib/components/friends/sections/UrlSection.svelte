<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import { isOpenFriendLinkModeActive, openFriendLinkModePrefix } from '$lib/stores/ui';
import type { Url, UrlInput } from '$shared';
import KeyboardHintBadge from '../../KeyboardHintBadge.svelte';
import { DeleteConfirmModal, DetailEditModal, UrlEditForm, UrlRow } from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  urls: Url[];
  linkStartIndex?: number;
}

let { friendId, urls, linkStartIndex }: Props = $props();

let editingId = $state<string | null>(null);
let editingData = $state<Url | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => UrlInput; isValid: () => boolean } | null>(null);

let deletingId = $state<string | null>(null);
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

let showModal = $derived(isAdding || editingId !== null);

function openAdd() {
  editingId = null;
  editingData = null;
  isAdding = true;
  editError = null;
  isDirty = false;
}

function openEdit(url: Url) {
  editingId = url.id;
  editingData = url;
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
      await friends.updateUrl(friendId, editingId, data);
    } else {
      await friends.addUrl(friendId, data);
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
    await friends.deleteUrl(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddUrl() {
    openAdd();
  }
  window.addEventListener('shortcut:add-url', handleAddUrl);
  return () => {
    window.removeEventListener('shortcut:add-url', handleAddUrl);
  };
});
</script>

{#if urls.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {$i18n.t('friendDetail.sections.websites')}
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
        {$i18n.t('friendDetail.actions.addUrl')}
      </button>
    </div>
    <div class="space-y-2">
      {#each urls as url, i (url.id)}
        <div class="relative">
          {#if linkStartIndex !== undefined}
            <KeyboardHintBadge index={linkStartIndex + i} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
          {/if}
          <UrlRow
            {url}
            onEdit={() => openEdit(url)}
            onDelete={() => openDeleteConfirm(url.id, url.url)}
            isDeleting={deletingId === url.id}
          />
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title="{editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.websiteUrl')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <UrlEditForm
      bind:this={formRef}
      initialData={editingData ?? undefined}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title="Delete Website"
    description="Are you sure you want to delete this website URL?"
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
