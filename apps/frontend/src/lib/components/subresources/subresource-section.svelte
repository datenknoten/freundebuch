<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import KeyboardHintBadge from '$lib/components/keyboard-hint-badge.svelte';
import { Button, ConfirmDialog, headingClasses, surfaceClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import {
  getKeyboardHint,
  isOpenFriendLinkModeActive,
  openFriendLinkModePrefix,
} from '$lib/stores/ui';
import { DetailEditModal } from '../friends/subresources';
import type { SubresourceDescriptor, SubresourceFormExports, SubresourceItem } from './types';

const i18n = createI18n();

interface Props {
  descriptor: SubresourceDescriptor;
  /** The friend or collective these sub-resources belong to. */
  ownerId: string;
  /** Shown as the edit modal's subtitle. */
  ownerName?: string;
  /**
   * Items owned by the caller (friend detail keeps them in its store). When
   * omitted the section loads and patches them itself through the descriptor.
   */
  items?: SubresourceItem[];
  /**
   * First index in the friend-detail "open link" keyboard sequence; enables
   * the per-row hint badges.
   */
  linkStartIndex?: number;
}

let { descriptor, ownerId, ownerName, items: providedItems, linkStartIndex }: Props = $props();

// Local helper so descriptors (plain modules) can resolve translations.
const translate = (key: string, params?: Record<string, unknown>): string => $i18n.t(key, params);

/** Items the section loaded itself; unused when the caller provides them. */
let loadedItems = $state<SubresourceItem[]>([]);
const ownsItems = $derived(providedItems === undefined);
const items = $derived(providedItems ?? loadedItems);

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
let deleteConfirmItem = $state<SubresourceItem | null>(null);
let deleteConfirmName = $state('');

// Narrowed once: the two arms of the descriptor union differ in how an item
// is added, and nothing else.
const customAdd = $derived('AddComponent' in descriptor ? descriptor : null);
const formDriven = $derived('AddComponent' in descriptor ? null : descriptor);
const showModal = $derived(isAdding || editingId !== null);

// Hint badges number the rows that actually register a link in the detail
// page's "o" sequence, so a row without one (a social profile with no URL)
// neither gets a badge nor shifts the rows after it.
const rows = $derived.by(() => {
  const start = linkStartIndex;
  if (start === undefined) return items.map((item) => ({ item, badgeIndex: undefined }));
  let offset = 0;
  return items.map((item) => {
    if (descriptor.linkable?.(item) === false) return { item, badgeIndex: undefined };
    const badgeIndex = start + offset;
    offset += 1;
    return { item, badgeIndex };
  });
});

// Dynamic components (Svelte 5 renders capitalised reactive values as components)
const Icon = $derived(descriptor.icon);
const RowComponent = $derived(descriptor.RowComponent);
const FormComponent = $derived(formDriven?.FormComponent);
const AddComponent = $derived(customAdd?.AddComponent);

const modalTitle = $derived(
  `${editingId !== null ? $i18n.t('friendDetail.modal.edit') : $i18n.t('friendDetail.modal.add')} ${
    formDriven === null ? '' : $i18n.t(formDriven.modalTypeNameKey)
  }`,
);

// Monotonic reload counter. Several reloads can be in flight for the *same*
// owner (address afterSave schedules a few, reloadAfterMutate triggers more),
// so an earlier slow response must not clobber a later one.
let reloadSeq = 0;

async function reload() {
  if (descriptor.load === undefined) return;
  const seq = ++reloadSeq;
  const requestedId = ownerId;
  const loaded = await descriptor.load(requestedId);
  // Drop stale responses: ignore this load if a newer one has since started, or
  // if the owner changed while it was in flight. The latest reload wins.
  if (seq !== reloadSeq || requestedId !== ownerId) return;
  loadedItems = loaded;
}

// Reset and reload whenever the owner changes. The parent keys this component
// only by descriptor.key, so navigating between owners reuses the instance
// without unmounting — without a reset the previous owner's items and any open
// edit/delete modal would linger (and mutations would target the new ownerId).
let loadedOwnerId: string | undefined;
$effect(() => {
  const id = ownerId;
  if (id.length > 0 && id !== loadedOwnerId) {
    loadedOwnerId = id;
    loadedItems = [];
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

function openAddFromTap() {
  // Mount the form inside the tap so its auto-focused field claims the mobile
  // keyboard (see lib/actions/auto-focus).
  openWithKeyboard(openAdd);
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
  if (formDriven === null || formRef === null || !formRef.isValid()) return;
  isEditLoading = true;
  editError = null;
  try {
    const data = formRef.getData();
    if (editingId !== null && formDriven.update !== undefined) {
      const updated = await formDriven.update(ownerId, editingId, data);
      if (ownsItems) {
        loadedItems = loadedItems.map((item) => (item.id === editingId ? updated : item));
      }
    } else if (descriptor.reloadAfterMutate === true) {
      await formDriven.create(ownerId, data);
      await reload();
    } else {
      const created = await formDriven.create(ownerId, data);
      if (ownsItems) {
        loadedItems = [...loadedItems, created as SubresourceItem];
      }
    }
    descriptor.afterSave?.(reload, ownerId);
    closeModal();
  } catch (err) {
    editError =
      descriptor.mapError?.(err, translate) ??
      (err instanceof Error && err.message.length > 0
        ? err.message
        : $i18n.t('subresources.common.failedToSave'));
    isEditLoading = false;
    return;
  }
  isEditLoading = false;
}

function openDeleteConfirm(item: SubresourceItem) {
  deleteConfirmItem = item;
  deleteConfirmName = descriptor.deleteName(item, translate);
}

function closeDeleteConfirm() {
  deleteConfirmItem = null;
  deleteConfirmName = '';
}

async function handleDelete() {
  const target = deleteConfirmItem;
  if (target === null) return;
  deletingId = target.id;
  try {
    await descriptor.remove(ownerId, target);
    if (ownsItems) {
      if (descriptor.reloadAfterMutate === true) {
        await reload();
      } else {
        loadedItems = loadedItems.filter((item) => item.id !== target.id);
      }
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
    <div class={surfaceClasses.section}>
      <h2 class="{headingClasses.section} flex items-center gap-2">
        <Icon class="w-5 h-5" strokeWidth="2" />
        {$i18n.t(descriptor.sectionTitleKey)}
      </h2>
      <Button
        variant="ghostAccent"
        size="xs"
        onclick={openAddFromTap}
        data-shortcut={descriptor.addShortcut}
        data-shortcut-label={descriptor.addShortcutLabel}
      >
        <Plus class="w-4 h-4" strokeWidth="2" />
        {$i18n.t(descriptor.addLabelKey)}
      </Button>
    </div>
    <div class="space-y-2">
      {#each rows as { item, badgeIndex } (item.id)}
        <div class="relative">
          {#if badgeIndex !== undefined}
            <KeyboardHintBadge
              index={badgeIndex}
              isActive={$isOpenFriendLinkModeActive}
              prefix={$openFriendLinkModePrefix}
            />
          {/if}
          <RowComponent
            {...descriptor.rowProps(item)}
            onEdit={descriptor.editable ? () => openEdit(item) : undefined}
            onDelete={() => openDeleteConfirm(item)}
            isDeleting={deletingId === item.id}
            shortcutHint={badgeIndex !== undefined ? `o ${getKeyboardHint(badgeIndex)}` : undefined}
          />
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if showModal && customAdd !== null && AddComponent !== undefined}
  <AddComponent
    {...customAdd.addProps({ ownerId, ownerName: ownerName ?? '', items })}
    onClose={closeModal}
  />
{:else if showModal && formDriven !== null && FormComponent !== undefined}
  <DetailEditModal
    title={modalTitle}
    subtitle={ownerName}
    isLoading={isEditLoading}
    error={editError}
    {isDirty}
    onSave={handleSave}
    onClose={closeModal}
  >
    <FormComponent
      bind:this={formRef}
      {...formDriven.formProps?.({
        editingData,
        editingId,
        itemCount: items.length,
        items,
        isLoading: isEditLoading,
      }) ?? {}}
      onchange={formDriven.tracksDirty === true ? () => (isDirty = true) : undefined}
    />
  </DetailEditModal>
{/if}

{#if deleteConfirmItem !== null}
  <ConfirmDialog
    title={$i18n.t(descriptor.deleteTitleKey)}
    description={$i18n.t(descriptor.deleteDescriptionKey)}
    itemPreview={deleteConfirmName}
    onConfirm={handleDelete}
    onClose={closeDeleteConfirm}
  />
{/if}
