<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { ProfessionalHistory, ProfessionalHistoryInput } from '$shared';
import {
  DeleteConfirmModal,
  DetailEditModal,
  ProfessionalHistoryEditForm,
  ProfessionalHistoryRow,
} from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  professionalHistory: ProfessionalHistory[];
}

let { friendId, professionalHistory }: Props = $props();

let editingId = $state<string | null>(null);
let editingData = $state<ProfessionalHistory | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => ProfessionalHistoryInput; isValid: () => boolean } | null>(
  null,
);

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

function openEdit(history: ProfessionalHistory) {
  editingId = history.id;
  editingData = history;
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
      await friends.updateProfessionalHistory(friendId, editingId, data);
    } else {
      await friends.addProfessionalHistory(friendId, data);
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
    await friends.deleteProfessionalHistory(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddProfessional() {
    openAdd();
  }
  window.addEventListener('shortcut:add-professional', handleAddProfessional);
  return () => {
    window.removeEventListener('shortcut:add-professional', handleAddProfessional);
  };
});
</script>

{#if professionalHistory.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {$i18n.t('friendDetail.sections.employmentHistory')}
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
        {$i18n.t('friendDetail.actions.addEmployment')}
      </button>
    </div>
    <div class="space-y-2">
      {#each professionalHistory as history (history.id)}
        <ProfessionalHistoryRow
          {history}
          onEdit={() => openEdit(history)}
          onDelete={() => openDeleteConfirm(history.id, history.jobTitle || history.organization || 'Employment')}
          isDeleting={deletingId === history.id}
        />
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title="{editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.employment')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <ProfessionalHistoryEditForm
      bind:this={formRef}
      initialData={editingData ?? undefined}
      defaultPrimary={!editingId && professionalHistory.length === 0}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title="Delete Employment"
    description="Are you sure you want to delete this employment record?"
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
