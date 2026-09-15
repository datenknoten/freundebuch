<script lang="ts">
import { onMount } from 'svelte';
import Plus from 'svelte-heros-v2/Plus.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
import { replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { openWithKeyboard } from '$lib/actions/auto-focus';
import AlertBanner from '$lib/components/alert-banner.svelte';
import CircleEditModal from '$lib/components/circles/circle-edit-modal.svelte';
import DetailActions from '$lib/components/friends/subresources/detail-actions.svelte';
import SwipeableRow from '$lib/components/friends/subresources/swipeable-row.svelte';
import KeyboardHintBadge from '$lib/components/keyboard-hint-badge.svelte';
import {
  Button,
  chipClasses,
  EmptyState,
  PageShell,
  SearchInput,
  Spinner,
} from '$lib/components/ui';
import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isAuthInitialized } from '$lib/stores/auth';
import { circles, circlesList } from '$lib/stores/circles';
import {
  deleteCircleModePrefix,
  editCircleModePrefix,
  getKeyboardHint,
  isDeleteCircleModeActive,
  isEditCircleModeActive,
  visibleCircleIds,
} from '$lib/stores/ui';
import { DEFAULT_CIRCLE_COLOR } from '$lib/utils/circle-colors';
import type { Circle } from '$shared';

const i18n = createI18n();

let hasLoaded = $state(false);
let showEditModal = $state(false);
let editingCircle = $state<Circle | null>(null);
let deleteConfirmCircle = $state<Circle | null>(null);
let deletingCircleId = $state<string | null>(null);
let searchQuery = $state('');

// Load circles when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    circles.loadCircles();
  }
});

// Set up keyboard shortcut event listeners
onMount(() => {
  function handleNewCircle() {
    openCreateModal();
  }

  function handleEditCircle(e: CustomEvent<{ circleId: string }>) {
    const circle = $circlesList.find((c) => c.id === e.detail.circleId);
    if (circle) {
      openEditModal(circle);
    }
  }

  function handleDeleteCircle(e: CustomEvent<{ circleId: string }>) {
    const circle = $circlesList.find((c) => c.id === e.detail.circleId);
    if (circle) {
      openDeleteConfirm(circle);
    }
  }

  window.addEventListener('shortcut:new-circle', handleNewCircle);
  window.addEventListener('shortcut:edit-circle', handleEditCircle as EventListener);
  window.addEventListener('shortcut:delete-circle', handleDeleteCircle as EventListener);

  // Auto-open the create modal when navigated here with ?new=1 (e.g. from the
  // mobile FAB long-press menu), then strip the flag so reloads don't reopen it.
  if ($page.url.searchParams.get('new') === '1') {
    openCreateModal();
    const cleaned = new URL($page.url);
    cleaned.searchParams.delete('new');
    replaceState(cleaned.pathname + cleaned.search, {});
  }

  return () => {
    window.removeEventListener('shortcut:new-circle', handleNewCircle);
    window.removeEventListener('shortcut:edit-circle', handleEditCircle as EventListener);
    window.removeEventListener('shortcut:delete-circle', handleDeleteCircle as EventListener);
  };
});

// Tap/click/swipe callers wrap these in openWithKeyboard() so the modal mounts
// inside the gesture and its auto-focused name input claims the mobile
// keyboard. Non-gesture callers (?new=1 auto-open, keyboard shortcuts) call
// them directly: there is no keyboard to claim, and a synchronous flush is not
// allowed from onMount anyway.
function openCreateModal() {
  editingCircle = null;
  showEditModal = true;
}

function openEditModal(circle: Circle) {
  editingCircle = circle;
  showEditModal = true;
}

function closeEditModal() {
  showEditModal = false;
  editingCircle = null;
}

function openDeleteConfirm(circle: Circle) {
  deleteConfirmCircle = circle;
}

function closeDeleteConfirm() {
  deleteConfirmCircle = null;
}

async function handleDelete(): Promise<void> {
  if (!deleteConfirmCircle) return;

  deletingCircleId = deleteConfirmCircle.id;
  try {
    await circles.deleteCircle(deleteConfirmCircle.id);
  } finally {
    deletingCircleId = null;
  }
}

// Get child circles for a given circle
function getChildCircles(parentId: string | null): Circle[] {
  return $circlesList.filter((c) => c.parentCircleId === parentId);
}

// Render circles with hierarchy
function renderCircleTree(parentId: string | null = null, depth: number = 0): Circle[] {
  const children = getChildCircles(parentId);
  const result: Circle[] = [];
  for (const child of children) {
    result.push({ ...child, sortOrder: depth }); // Using sortOrder to store depth temporarily
    result.push(...renderCircleTree(child.id, depth + 1));
  }
  return result;
}

let hierarchicalCircles = $derived(renderCircleTree(null, 0));

// When user is searching, render flat filtered list (drops hierarchy intentionally so matches surface)
let visibleCircles = $derived.by(() => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return hierarchicalCircles;
  return $circlesList
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({ ...c, sortOrder: 0 }));
});
let isSearching = $derived(searchQuery.trim().length > 0);

// Update visible circle IDs for keyboard navigation
$effect(() => {
  visibleCircleIds.set(visibleCircles.map((c) => c.id));
});

// Check if keyboard hints should be shown
let showKeyboardHints = $derived($isEditCircleModeActive || $isDeleteCircleModeActive);

// Get the current prefix for keyboard hints
let currentPrefix = $derived(
  $isEditCircleModeActive ? $editCircleModePrefix : $deleteCircleModePrefix,
);

// Calculate actual depth for each circle
function getActualDepth(circle: Circle): number {
  let d = 0;
  let current = circle;
  while (current.parentCircleId) {
    d++;
    const parent = $circlesList.find((c) => c.id === current.parentCircleId);
    if (!parent) break;
    current = parent;
  }
  return d;
}
</script>

<svelte:head>
  <title>{$i18n.t('circles.title')} | Freundebuch</title>
</svelte:head>

<PageShell
  width="list"
  title={$i18n.t('circles.title')}
  subtitle={$i18n.t('circles.subtitle')}
>
  {#snippet actions()}
    <Button
      onclick={() => openWithKeyboard(openCreateModal)}
      data-shortcut="n c"
      data-shortcut-label="shortcuts.newCircle"
    >
      <Plus class="w-5 h-5" strokeWidth="2" />
      {$i18n.t('circles.newCircle')}
    </Button>
  {/snippet}

  <!-- Search + count toolbar -->
  {#if hasLoaded && $circlesList.length > 0}
    <div class="mb-6">
      <SearchInput
        bind:value={searchQuery}
        onclear={() => (searchQuery = '')}
        placeholder={$i18n.t('circles.searchPlaceholder')}
        ariaLabel={$i18n.t('circles.searchPlaceholder')}
      />
      <div class="mt-3 text-sm font-body text-gray-600">
        {$i18n.t('circles.circleCount', { count: visibleCircles.length })}
        {#if isSearching}
          <span class="text-gray-400">{$i18n.t('common.filtered')}</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Edit/Create Modal -->
  {#if showEditModal}
    <CircleEditModal circle={editingCircle} onClose={closeEditModal} />
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if deleteConfirmCircle}
    <ConfirmDialog
      title={$i18n.t('circles.delete.title')}
      description={deleteConfirmCircle.friendCount > 0
        ? $i18n.t('circles.delete.messageWithCount', { count: deleteConfirmCircle.friendCount })
        : $i18n.t('circles.delete.message', { name: deleteConfirmCircle.name })}
      itemPreview={deleteConfirmCircle.name}
      onConfirm={handleDelete}
      onClose={closeDeleteConfirm}
    />
  {/if}

  <!-- Circles List -->
  {#if $circles.isLoading && !hasLoaded}
    <div class="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  {:else if $circles.error}
    <AlertBanner variant="error">{$circles.error}</AlertBanner>
  {:else if $circlesList.length === 0}
    <EmptyState
      icon={Users}
      title={$i18n.t('circles.noCircles')}
      description={$i18n.t('circles.noCirclesSubtitle')}
    >
      <Button onclick={() => openWithKeyboard(openCreateModal)}>
        <Plus class="w-5 h-5" strokeWidth="2" />
        {$i18n.t('circles.createFirst')}
      </Button>
    </EmptyState>
  {:else if isSearching && visibleCircles.length === 0}
    <EmptyState icon={Users} title={$i18n.t('circles.noMatches')} />
  {:else}
    <div class="space-y-2">
      {#each visibleCircles as circle, index (circle.id)}
        {@const actualDepth = isSearching ? 0 : getActualDepth(circle)}
        {@const isDeleting = deletingCircleId === circle.id}
        {@const keyHint = getKeyboardHint(index)}

        <!-- Mobile: Swipeable row -->
        <div class="sm:hidden" style:margin-left="{actualDepth * 16}px">
          <SwipeableRow
            onSwipeRight={() => openWithKeyboard(() => openEditModal(circle))}
            onSwipeLeft={() => openDeleteConfirm(circle)}
            disabled={isDeleting}
          >
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 group relative">
              <!-- Keyboard hint -->
              <KeyboardHintBadge
                {index}
                isActive={showKeyboardHints}
                prefix={currentPrefix}
                tone={$isDeleteCircleModeActive ? 'danger' : 'forest'}
              />

              <!-- Color indicator -->
              <div
                class="w-4 h-4 rounded-full shrink-0"
                style:background-color={circle.color ?? DEFAULT_CIRCLE_COLOR}
              ></div>

              <!-- Circle info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-body font-medium text-gray-800 truncate">{circle.name}</span>
                  {#if circle.friendCount > 0}
                    <span class="{chipClasses.base} {chipClasses.neutral}">
                      {$i18n.t('circles.friend', { count: circle.friendCount })}
                    </span>
                  {/if}
                </div>
                {#if circle.parentCircleId}
                  {@const parent = $circlesList.find((c) => c.id === circle.parentCircleId)}
                  {#if parent}
                    <p class="text-xs font-body text-gray-500 mt-0.5">
                      {$i18n.t('circles.inCircle', { name: parent.name })}
                    </p>
                  {/if}
                {/if}
              </div>

              <!-- Actions (visible on mobile for accessibility) -->
              <DetailActions
                onEdit={() => openWithKeyboard(() => openEditModal(circle))}
                onDelete={() => openDeleteConfirm(circle)}
                {isDeleting}
                editLabel={$i18n.t('common.edit') + ' ' + circle.name}
                deleteLabel={$i18n.t('common.delete') + ' ' + circle.name}
                editShortcutHint="e {keyHint}"
                editShortcutLabel="shortcuts.panels.editCircle"
                deleteShortcutHint="d {keyHint}"
                deleteShortcutLabel="shortcuts.panels.deleteCircle"
              />
            </div>
          </SwipeableRow>
        </div>

        <!-- Desktop: Hover-revealed actions -->
        <div class="hidden sm:block" style:margin-left="{actualDepth * 24}px">
          <div
            class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group relative"
          >
            <!-- Keyboard hint -->
            <KeyboardHintBadge
              {index}
              isActive={showKeyboardHints}
              prefix={currentPrefix}
              tone={$isDeleteCircleModeActive ? 'danger' : 'forest'}
            />

            <!-- Color indicator -->
            <div
              class="w-4 h-4 rounded-full shrink-0"
              style:background-color={circle.color ?? DEFAULT_CIRCLE_COLOR}
            ></div>

            <!-- Circle info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-body font-medium text-gray-800 truncate">{circle.name}</span>
                {#if circle.friendCount > 0}
                  <span class="{chipClasses.base} {chipClasses.neutral}">
                    {$i18n.t('circles.friend', { count: circle.friendCount })}
                  </span>
                {/if}
              </div>
              {#if circle.parentCircleId}
                {@const parent = $circlesList.find((c) => c.id === circle.parentCircleId)}
                {#if parent}
                  <p class="text-xs font-body text-gray-500 mt-0.5">
                    {$i18n.t('circles.inCircle', { name: parent.name })}
                  </p>
                {/if}
              {/if}
            </div>

            <!-- Actions -->
            <DetailActions
              onEdit={() => openWithKeyboard(() => openEditModal(circle))}
              onDelete={() => openDeleteConfirm(circle)}
              {isDeleting}
              editLabel={$i18n.t('common.edit') + ' ' + circle.name}
              deleteLabel={$i18n.t('common.delete') + ' ' + circle.name}
              editShortcutHint="e {keyHint}"
              editShortcutLabel="shortcuts.panels.editCircle"
              deleteShortcutHint="d {keyHint}"
              deleteShortcutLabel="shortcuts.panels.deleteCircle"
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageShell>
