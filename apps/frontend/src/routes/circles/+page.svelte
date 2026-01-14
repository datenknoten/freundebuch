<script lang="ts">
import { onMount } from 'svelte';
import CircleChip from '$lib/components/circles/CircleChip.svelte';
import { isAuthInitialized } from '$lib/stores/auth';
import { circles, circlesList } from '$lib/stores/circles';
import type { Circle, CircleInput } from '$shared';
import { CIRCLE_COLORS } from '$shared';

let hasLoaded = $state(false);
let isCreating = $state(false);
let editingCircle = $state<Circle | null>(null);
let deleteConfirmCircle = $state<Circle | null>(null);

// Form state
let formName = $state('');
let formColor = $state<string>(CIRCLE_COLORS[5]); // Default blue
let formParentId = $state<string | null>(null);
let formError = $state('');
let isSubmitting = $state(false);
let nameInputRef = $state<HTMLInputElement | null>(null);

// Focus the name input when the form opens
$effect(() => {
  if ((isCreating || editingCircle) && nameInputRef) {
    nameInputRef.focus();
  }
});

// Load circles when auth is ready
$effect(() => {
  if ($isAuthInitialized && !hasLoaded) {
    hasLoaded = true;
    circles.loadCircles();
  }
});

function startCreate() {
  isCreating = true;
  editingCircle = null;
  formName = '';
  formColor = CIRCLE_COLORS[5];
  formParentId = null;
  formError = '';
}

function startEdit(circle: Circle) {
  isCreating = false;
  editingCircle = circle;
  formName = circle.name;
  formColor = circle.color ?? CIRCLE_COLORS[5];
  formParentId = circle.parentCircleId;
  formError = '';
}

function cancelForm() {
  isCreating = false;
  editingCircle = null;
  formError = '';
}

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  formError = '';

  if (!formName.trim()) {
    formError = 'Circle name is required';
    return;
  }

  isSubmitting = true;

  try {
    const input: CircleInput = {
      name: formName.trim(),
      color: formColor,
      parent_circle_id: formParentId,
    };

    if (editingCircle) {
      await circles.updateCircle(editingCircle.id, input);
    } else {
      await circles.createCircle(input);
    }

    cancelForm();
  } catch (err) {
    formError = (err as Error)?.message || 'Failed to save circle';
  } finally {
    isSubmitting = false;
  }
}

async function handleDelete() {
  if (!deleteConfirmCircle) return;

  isSubmitting = true;
  try {
    await circles.deleteCircle(deleteConfirmCircle.id);
    deleteConfirmCircle = null;
  } catch (err) {
    formError = (err as Error)?.message || 'Failed to delete circle';
  } finally {
    isSubmitting = false;
  }
}

// Get valid parent options (exclude the current circle and its children to prevent circular references)
// Returns circles in tree order with depth information
function getParentOptionsTree(
  currentCircleId: string | null,
): Array<{ circle: Circle; depth: number }> {
  // Get all descendant IDs of the current circle (to exclude them)
  function getDescendantIds(parentId: string): Set<string> {
    const ids = new Set<string>();
    for (const c of $circlesList) {
      if (c.parentCircleId === parentId) {
        ids.add(c.id);
        const childIds = getDescendantIds(c.id);
        for (const id of childIds) {
          ids.add(id);
        }
      }
    }
    return ids;
  }

  const excludeIds = currentCircleId ? getDescendantIds(currentCircleId) : new Set<string>();
  if (currentCircleId) excludeIds.add(currentCircleId);

  // Build tree structure
  function buildTree(
    parentId: string | null,
    depth: number,
  ): Array<{ circle: Circle; depth: number }> {
    const result: Array<{ circle: Circle; depth: number }> = [];
    const children = $circlesList.filter(
      (c) => c.parentCircleId === parentId && !excludeIds.has(c.id),
    );

    for (const child of children) {
      result.push({ circle: child, depth });
      result.push(...buildTree(child.id, depth + 1));
    }
    return result;
  }

  return buildTree(null, 0);
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
        {#if !isCreating && !editingCircle}
          <button
            onclick={startCreate}
            class="inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Circle
          </button>
        {/if}
      </div>

      <!-- Create/Edit Form -->
      {#if isCreating || editingCircle}
        <div class="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 class="text-lg font-heading text-gray-800 mb-4">
            {editingCircle ? 'Edit Circle' : 'Create New Circle'}
          </h2>

          {#if formError}
            <div class="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm" role="alert">
              {formError}
            </div>
          {/if}

          <form onsubmit={handleSubmit} class="space-y-4">
            <!-- Name -->
            <div>
              <label for="circle-name" class="block text-sm font-body font-semibold text-gray-700 mb-2">
                Name
              </label>
              <input
                bind:this={nameInputRef}
                type="text"
                id="circle-name"
                bind:value={formName}
                placeholder="e.g., Family, Work, Book Club"
                maxlength="100"
                required
                disabled={isSubmitting}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body disabled:bg-gray-100"
              />
            </div>

            <!-- Color -->
            <fieldset>
              <legend class="block text-sm font-body font-semibold text-gray-700 mb-2">
                Color
              </legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Circle color">
                {#each CIRCLE_COLORS as color}
                  <button
                    type="button"
                    onclick={() => formColor = color}
                    disabled={isSubmitting}
                    class="w-8 h-8 rounded-full border-2 transition-all {formColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}"
                    style:background-color={color}
                    aria-label="Select {color}"
                    aria-pressed={formColor === color}
                    title={color}
                  ></button>
                {/each}
              </div>
            </fieldset>

            <!-- Parent Circle -->
            <div>
              <label for="parent-circle" class="block text-sm font-body font-semibold text-gray-700 mb-2">
                Parent Circle (optional)
              </label>
              <select
                id="parent-circle"
                bind:value={formParentId}
                disabled={isSubmitting}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest focus:border-transparent font-body disabled:bg-gray-100"
              >
                <option value={null}>None (top-level circle)</option>
                {#each getParentOptionsTree(editingCircle?.id ?? null) as { circle: parentCircle, depth }}
                  <option value={parentCircle.id}>{'\u00A0\u00A0\u00A0'.repeat(depth)}{parentCircle.name}</option>
                {/each}
              </select>
              <p class="mt-1 text-xs font-body text-gray-500">
                Nest this circle under another to create a hierarchy
              </p>
            </div>

            <!-- Preview -->
            <div>
              <span class="block text-sm font-body font-semibold text-gray-700 mb-2">
                Preview
              </span>
              <CircleChip circle={{ id: 'preview', name: formName || 'Circle Name', color: formColor }} size="md" />
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                class="flex-1 bg-forest text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-forest-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (editingCircle ? 'Save Changes' : 'Create Circle')}
              </button>
              <button
                type="button"
                onclick={cancelForm}
                disabled={isSubmitting}
                class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-body font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      {/if}

      <!-- Delete Confirmation Modal -->
      {#if deleteConfirmCircle}
        <div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-heading text-gray-800 mb-2">Delete Circle</h3>
            <p class="text-gray-600 font-body mb-4">
              Are you sure you want to delete <strong>{deleteConfirmCircle.name}</strong>?
              {#if deleteConfirmCircle.friendCount > 0}
                <br />
                <span class="text-amber-600">
                  {deleteConfirmCircle.friendCount} friend{deleteConfirmCircle.friendCount === 1 ? '' : 's'} will be removed from this circle.
                </span>
              {/if}
            </p>
            {#if formError}
              <div class="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm" role="alert">
                {formError}
              </div>
            {/if}
            <div class="flex gap-3">
              <button
                onclick={handleDelete}
                disabled={isSubmitting}
                class="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-body font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onclick={() => { deleteConfirmCircle = null; formError = ''; }}
                disabled={isSubmitting}
                class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-body font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Circles List -->
      {#if $circles.isLoading && !hasLoaded}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
        </div>
      {:else if $circles.error}
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg font-body text-sm" role="alert">
          {$circles.error}
        </div>
      {:else if $circlesList.length === 0}
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 class="text-lg font-heading text-gray-600 mb-2">No circles yet</h3>
          <p class="text-gray-500 font-body mb-4">Create circles to organize your friends</p>
          <button
            onclick={startCreate}
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
          {#each hierarchicalCircles as circle, index (circle.id)}
            {@const depth = $circlesList.find((c) => c.id === circle.id)?.parentCircleId ? 1 : 0}
            {@const actualDepth = (() => {
              let d = 0;
              let current = circle;
              while (current.parentCircleId) {
                d++;
                const parent = $circlesList.find((c) => c.id === current.parentCircleId);
                if (!parent) break;
                current = parent;
              }
              return d;
            })()}
            <div
              class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              style:margin-left="{actualDepth * 24}px"
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
              <div class="flex items-center gap-2 shrink-0">
                <button
                  onclick={() => startEdit(circle)}
                  class="p-2 text-gray-400 hover:text-forest hover:bg-white rounded-lg transition-colors"
                  title="Edit circle"
                  aria-label="Edit {circle.name}"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onclick={() => deleteConfirmCircle = circle}
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                  title="Delete circle"
                  aria-label="Delete {circle.name}"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
