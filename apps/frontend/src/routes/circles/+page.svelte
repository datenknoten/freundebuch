<script lang="ts">
import { onMount } from 'svelte';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import CircleEditModal from '$lib/components/circles/CircleEditModal.svelte';
import DeleteConfirmModal from '$lib/components/friends/subresources/DeleteConfirmModal.svelte';
import DetailActions from '$lib/components/friends/subresources/DetailActions.svelte';
import SwipeableRow from '$lib/components/friends/subresources/SwipeableRow.svelte';
import { isAuthInitialized } from '$lib/stores/auth';
import { circles, circlesList } from '$lib/stores/circles';
import type { Circle } from '$shared';

let hasLoaded = $state(false);
let showEditModal = $state(false);
let editingCircle = $state<Circle | null>(null);
let deleteConfirmCircle = $state<Circle | null>(null);
let deletingCircleId = $state<string | null>(null);

// Load circles when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    circles.loadCircles();
  }
});

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
  <title>Circles | Freundebuch</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-4xl mx-auto mt-8">
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-heading text-forest">Circles</h1>
          <p class="text-gray-600 font-body mt-1">Organize your friends into circles</p>
        </div>
        <button
          onclick={openCreateModal}
          class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Circle
        </button>
      </div>

      <!-- Edit/Create Modal -->
      {#if showEditModal}
        <CircleEditModal circle={editingCircle} onClose={closeEditModal} />
      {/if}

      <!-- Delete Confirmation Modal -->
      {#if deleteConfirmCircle}
        <DeleteConfirmModal
          title="Delete Circle"
          description={deleteConfirmCircle.friendCount > 0
            ? `Are you sure you want to delete this circle? ${deleteConfirmCircle.friendCount} friend${deleteConfirmCircle.friendCount === 1 ? '' : 's'} will be removed from this circle.`
            : 'Are you sure you want to delete this circle?'}
          itemPreview={deleteConfirmCircle.name}
          onConfirm={handleDelete}
          onClose={closeDeleteConfirm}
        />
      {/if}

      <!-- Circles List -->
      {#if $circles.isLoading && !hasLoaded}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
      {:else if $circles.error}
        <AlertBanner variant="error">{$circles.error}</AlertBanner>
      {:else if $circlesList.length === 0}
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 class="text-lg font-heading text-gray-600 mb-2">No circles yet</h3>
          <p class="text-gray-500 font-body mb-4">Create circles to organize your friends</p>
          <button
            onclick={openCreateModal}
            class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create your first circle
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          {#each hierarchicalCircles as circle (circle.id)}
            {@const actualDepth = getActualDepth(circle)}
            {@const isDeleting = deletingCircleId === circle.id}

            <!-- Mobile: Swipeable row -->
            <div class="sm:hidden" style:margin-left="{actualDepth * 16}px">
              <SwipeableRow
                onSwipeRight={() => openEditModal(circle)}
                onSwipeLeft={() => openDeleteConfirm(circle)}
                disabled={isDeleting}
              >
                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                  <!-- Color indicator -->
                  <div
                    class="w-4 h-4 rounded-full shrink-0"
                    style:background-color={circle.color ?? '#6B7280'}
                  ></div>

                  <!-- Circle info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-body font-medium text-gray-800 truncate">{circle.name}</span>
                      {#if circle.friendCount > 0}
                        <span class="text-xs font-body text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          {circle.friendCount} friend{circle.friendCount === 1 ? '' : 's'}
                        </span>
                      {/if}
                    </div>
                    {#if circle.parentCircleId}
                      {@const parent = $circlesList.find((c) => c.id === circle.parentCircleId)}
                      {#if parent}
                        <p class="text-xs font-body text-gray-500 mt-0.5">
                          in {parent.name}
                        </p>
                      {/if}
                    {/if}
                  </div>

                  <!-- Actions (visible on mobile for accessibility) -->
                  <DetailActions
                    onEdit={() => openEditModal(circle)}
                    onDelete={() => openDeleteConfirm(circle)}
                    {isDeleting}
                    editLabel="Edit {circle.name}"
                    deleteLabel="Delete {circle.name}"
                  />
                </div>
              </SwipeableRow>
            </div>

            <!-- Desktop: Hover-revealed actions -->
            <div class="hidden sm:block" style:margin-left="{actualDepth * 24}px">
              <div
                class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
              >
                <!-- Color indicator -->
                <div
                  class="w-4 h-4 rounded-full shrink-0"
                  style:background-color={circle.color ?? '#6B7280'}
                ></div>

                <!-- Circle info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-body font-medium text-gray-800 truncate">{circle.name}</span>
                    {#if circle.friendCount > 0}
                      <span class="text-xs font-body text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {circle.friendCount} friend{circle.friendCount === 1 ? '' : 's'}
                      </span>
                    {/if}
                  </div>
                  {#if circle.parentCircleId}
                    {@const parent = $circlesList.find((c) => c.id === circle.parentCircleId)}
                    {#if parent}
                      <p class="text-xs font-body text-gray-500 mt-0.5">
                        in {parent.name}
                      </p>
                    {/if}
                  {/if}
                </div>

                <!-- Actions -->
                <DetailActions
                  onEdit={() => openEditModal(circle)}
                  onDelete={() => openDeleteConfirm(circle)}
                  {isDeleting}
                  editLabel="Edit {circle.name}"
                  deleteLabel="Delete {circle.name}"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
