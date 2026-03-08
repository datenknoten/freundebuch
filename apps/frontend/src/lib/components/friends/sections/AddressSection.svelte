<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { Address, AddressInput } from '$shared';
import { AddressEditForm, AddressRow, DeleteConfirmModal, DetailEditModal } from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  addresses: Address[];
}

let { friendId, addresses }: Props = $props();

let editingId = $state<string | null>(null);
let editingData = $state<Address | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => AddressInput; isValid: () => boolean } | null>(null);

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

function openEdit(address: Address) {
  editingId = address.id;
  editingData = address;
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
      await friends.updateAddress(friendId, editingId, data);
    } else {
      await friends.addAddress(friendId, data);
    }
    closeModal();
  } catch (err) {
    editError = err instanceof Error ? err.message : $i18n.t('subresources.common.failedToSave');
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
    await friends.deleteAddress(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddAddress() {
    openAdd();
  }
  window.addEventListener('shortcut:add-address', handleAddAddress);
  return () => {
    window.removeEventListener('shortcut:add-address', handleAddAddress);
  };
});
</script>

{#if addresses.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {$i18n.t('friendDetail.sections.addresses')}
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
        {$i18n.t('friendDetail.actions.addAddress')}
      </button>
    </div>
    <div class="space-y-2">
      {#each addresses as address (address.id)}
        <AddressRow
          {address}
          onEdit={() => openEdit(address)}
          onDelete={() => openDeleteConfirm(address.id, address.streetLine1 || address.city || 'this address')}
          isDeleting={deletingId === address.id}
        />
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title="{editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.address')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <AddressEditForm
      bind:this={formRef}
      initialData={editingData ?? undefined}
      defaultPrimary={!editingId && addresses.length === 0}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title={$i18n.t('friendDetail.modal.deleteAddress')}
    description={$i18n.t('friendDetail.modal.confirmDeleteAddress')}
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
