<script lang="ts">
import { onMount } from 'svelte';
import PhoneIcon from 'svelte-heros-v2/Phone.svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import { isOpenFriendLinkModeActive, openFriendLinkModePrefix } from '$lib/stores/ui';
import type { Phone, PhoneInput } from '$shared';
import KeyboardHintBadge from '../../KeyboardHintBadge.svelte';
import { DeleteConfirmModal, DetailEditModal, PhoneEditForm, PhoneRow } from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  phones: Phone[];
  linkStartIndex?: number;
}

let { friendId, phones, linkStartIndex }: Props = $props();

// Edit modal state
let editingId = $state<string | null>(null);
let editingData = $state<Phone | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => PhoneInput; isValid: () => boolean } | null>(null);

// Delete state
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

function openEdit(phone: Phone) {
  editingId = phone.id;
  editingData = phone;
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
      await friends.updatePhone(friendId, editingId, data);
    } else {
      await friends.addPhone(friendId, data);
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
    await friends.deletePhone(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddPhone() {
    openAdd();
  }
  window.addEventListener('shortcut:add-phone', handleAddPhone);
  return () => {
    window.removeEventListener('shortcut:add-phone', handleAddPhone);
  };
});
</script>

{#if phones.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <PhoneIcon class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('friendDetail.sections.phoneNumbers')}
      </h2>
      <button
        type="button"
        onclick={openAdd}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        <Plus class="w-4 h-4" strokeWidth="2" />
        {$i18n.t('friendDetail.actions.addPhone')}
      </button>
    </div>
    <div class="space-y-2">
      {#each phones as phone, i (phone.id)}
        <div class="relative">
          {#if linkStartIndex !== undefined}
            <KeyboardHintBadge index={linkStartIndex + i} isActive={$isOpenFriendLinkModeActive} prefix={$openFriendLinkModePrefix} />
          {/if}
          <PhoneRow
            {phone}
            onEdit={() => openEdit(phone)}
            onDelete={() => openDeleteConfirm(phone.id, phone.phoneNumber)}
            isDeleting={deletingId === phone.id}
          />
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title="{editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.phoneNumber')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <PhoneEditForm
      bind:this={formRef}
      initialData={editingData ?? undefined}
      defaultPrimary={!editingId && phones.length === 0}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title={$i18n.t('friendDetail.modal.deletePhoneNumber')}
    description={$i18n.t('friendDetail.modal.confirmDeletePhone')}
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
