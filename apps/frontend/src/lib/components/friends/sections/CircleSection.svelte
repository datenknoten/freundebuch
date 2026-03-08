<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { friends } from '$lib/stores/friends';
import type { CircleSummary } from '$shared';
import { CircleEditForm, CircleRow, DeleteConfirmModal, DetailEditModal } from '../subresources';

const i18n = createI18n();

interface Props {
  friendId: string;
  circles: CircleSummary[];
  existingCircles: CircleSummary[];
}

let { friendId, circles, existingCircles }: Props = $props();

let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<{ getData: () => { circleId: string }; isValid: () => boolean } | null>(null);

let deletingId = $state<string | null>(null);
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

function openAdd() {
  isAdding = true;
  editError = null;
  isDirty = false;
}

function closeModal() {
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
    await friends.addCircle(friendId, data.circleId);
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
    await friends.removeCircle(friendId, deleteConfirmId);
  } finally {
    deletingId = null;
  }
}

onMount(() => {
  function handleAddCircle() {
    openAdd();
  }
  window.addEventListener('shortcut:add-circle', handleAddCircle);
  return () => {
    window.removeEventListener('shortcut:add-circle', handleAddCircle);
  };
});
</script>

{#if circles.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {$i18n.t('friendDetail.sections.circles')}
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
        {$i18n.t('friendDetail.actions.addCircle')}
      </button>
    </div>
    <div class="space-y-2">
      {#each circles as circle (circle.id)}
        <CircleRow
          {circle}
          onDelete={() => openDeleteConfirm(circle.id, circle.name)}
          isDeleting={deletingId === circle.id}
        />
      {/each}
    </div>
  </section>
{/if}

{#if isAdding}
  <DetailEditModal
    title="{$i18n.t('friendDetail.modal.add')} {$i18n.t('friendDetail.modal.circle')}"
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <CircleEditForm
      bind:this={formRef}
      existingCircles={existingCircles}
      disabled={isEditLoading}
      onchange={() => isDirty = true}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title="Remove from Circle"
    description="Are you sure you want to remove this friend from this circle?"
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
