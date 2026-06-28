<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { DeleteConfirmModal, DetailEditModal } from '../friends/subresources';
import type {
  SubresourceDescriptor,
  SubresourceFormExports,
  SubresourceItem,
} from './subresource-descriptors';

const i18n = createI18n();

interface Props {
  descriptor: SubresourceDescriptor;
  collectiveId: string;
  collectiveName: string;
}

let { descriptor, collectiveId, collectiveName }: Props = $props();

// Local helper so descriptors (plain modules) can resolve translations.
const translate = (key: string, params?: Record<string, unknown>): string => $i18n.t(key, params);

// Loaded items for this sub-resource type
let items = $state<SubresourceItem[]>([]);

// Edit modal state
let editingId = $state<string | null>(null);
let editingData = $state<SubresourceItem | null>(null);
let isAdding = $state(false);
let isEditLoading = $state(false);
let editError = $state<string | null>(null);
let isDirty = $state(false);
let formRef = $state<SubresourceFormExports | null>(null);

// Delete state
let deletingId = $state<string | null>(null);
let deleteConfirmId = $state<string | null>(null);
let deleteConfirmName = $state('');

let showModal = $derived(isAdding || editingId !== null);

// Dynamic components (Svelte 5 renders capitalised reactive values as components)
let Icon = $derived(descriptor.icon);
let RowComponent = $derived(descriptor.RowComponent);
let FormComponent = $derived(descriptor.FormComponent);

let modalTypeName = $derived(
  descriptor.modalTypeNameKey
    ? $i18n.t(descriptor.modalTypeNameKey)
    : (descriptor.modalTypeNameLiteral ?? ''),
);
let modalTitle = $derived(
  `${editingId ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} ${modalTypeName}`,
);

// Monotonic reload counter. Several reloads can be in flight for the *same*
// collective (address afterSave schedules a few, reloadAfterMutate triggers
// more), so an earlier slow response must not clobber a later one.
let reloadSeq = 0;

async function reload() {
  const seq = ++reloadSeq;
  const requestedId = collectiveId;
  const loaded = await descriptor.load(requestedId);
  // Drop stale responses: ignore this load if a newer one has since started, or
  // if the collective changed while it was in flight. The latest reload wins.
  if (seq !== reloadSeq || requestedId !== collectiveId) return;
  items = loaded;
}

// Reset and reload whenever the collective changes. The parent keys this
// component only by descriptor.key, so navigating between collectives reuses
// the instance without unmounting — without a reset the previous collective's
// items and any open edit/delete modal would linger (and mutations would then
// target the new collectiveId).
let loadedCollectiveId: string | undefined;
$effect(() => {
  const id = collectiveId;
  if (id && id !== loadedCollectiveId) {
    loadedCollectiveId = id;
    items = [];
    closeModal();
    closeDeleteConfirm();
    reload().catch((err) => console.error('Failed to load sub-resources:', err));
  }
});

function openAdd() {
  editingId = null;
  editingData = null;
  isAdding = true;
  editError = null;
  isDirty = false;
}

function openEdit(item: SubresourceItem) {
  editingId = item.id;
  editingData = item;
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
  if (!formRef || !formRef.isValid()) return;
  isEditLoading = true;
  editError = null;
  try {
    const data = formRef.getData() as Parameters<SubresourceDescriptor['create']>[1];
    if (editingId && descriptor.update) {
      const updated = await descriptor.update(collectiveId, editingId, data);
      items = items.map((item) => (item.id === editingId ? updated : item));
    } else if (descriptor.reloadAfterMutate) {
      await descriptor.create(collectiveId, data);
      await reload();
    } else {
      const created = (await descriptor.create(collectiveId, data)) as SubresourceItem;
      items = [...items, created];
    }
    descriptor.afterSave?.(reload);
    closeModal();
  } catch (err) {
    editError =
      descriptor.mapError?.(err, translate) ??
      (err as Error).message ??
      $i18n.t('subresources.common.failedToSave');
  } finally {
    isEditLoading = false;
  }
}

function openDeleteConfirm(item: SubresourceItem) {
  deleteConfirmId = item.id;
  deleteConfirmName = descriptor.deleteName(item, translate);
}

function closeDeleteConfirm() {
  deleteConfirmId = null;
  deleteConfirmName = '';
}

async function handleDelete() {
  if (!deleteConfirmId) return;
  const id = deleteConfirmId;
  deletingId = id;
  try {
    await descriptor.remove(collectiveId, id);
    if (descriptor.reloadAfterMutate) {
      await reload();
    } else {
      items = items.filter((item) => item.id !== id);
    }
  } finally {
    deletingId = null;
  }
}

// Keyboard shortcut: open this section's add modal
onMount(() => {
  function handleAddShortcut() {
    openAdd();
  }
  window.addEventListener(descriptor.shortcutEvent, handleAddShortcut);
  return () => {
    window.removeEventListener(descriptor.shortcutEvent, handleAddShortcut);
  };
});
</script>

{#if items.length > 0}
  <section class="space-y-2">
    <div class="flex items-center justify-between bg-forest text-white px-3 py-1.5 rounded-lg">
      <h2 class="text-lg font-heading flex items-center gap-2">
        <Icon class="w-5 h-5" strokeWidth="2" />
        {$i18n.t(descriptor.sectionTitleKey)}
      </h2>
      <button
        type="button"
        onclick={openAdd}
        class="text-sm font-body font-semibold text-white/90 hover:text-white
               flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        data-shortcut={descriptor.addShortcut}
        data-shortcut-label={descriptor.addShortcutLabel}
      >
        <Plus class="w-4 h-4" strokeWidth="2" />
        {$i18n.t(descriptor.addLabelKey)}
      </button>
    </div>
    <div class="space-y-2">
      {#each items as item (item.id)}
        <RowComponent
          {...descriptor.rowProps(item)}
          onEdit={descriptor.editable ? () => openEdit(item) : undefined}
          onDelete={() => openDeleteConfirm(item)}
          isDeleting={deletingId === item.id}
        />
      {/each}
    </div>
  </section>
{/if}

{#if showModal}
  <DetailEditModal
    title={modalTitle}
    subtitle={collectiveName}
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <FormComponent
      bind:this={formRef}
      {...descriptor.formProps({
        editingData,
        editingId,
        itemCount: items.length,
        items,
        isLoading: isEditLoading,
      })}
      onchange={descriptor.tracksDirty ? () => (isDirty = true) : undefined}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmId}
  <DeleteConfirmModal
    title={descriptor.deleteTitle}
    description={descriptor.deleteDescription}
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
