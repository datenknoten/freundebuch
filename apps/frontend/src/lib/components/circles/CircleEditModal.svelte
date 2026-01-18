<script lang="ts">
import { circles, circlesList } from '$lib/stores/circles';
import { isModalOpen } from '$lib/stores/ui';
import type { Circle, CircleInput } from '$shared';
import { CIRCLE_COLORS } from '$shared';
import CircleChip from './CircleChip.svelte';

interface Props {
  circle?: Circle | null;
  onClose: () => void;
}

let { circle = null, onClose }: Props = $props();

const isEditing = $derived(!!circle);

// Form state
let formName = $state('');
let formColor = $state<string>(CIRCLE_COLORS[5]);
let formParentId = $state<string | null>(null);
let formError = $state('');
let isSubmitting = $state(false);
let nameInputRef = $state<HTMLInputElement | null>(null);
let showUnsavedWarning = $state(false);

// Track which circle we initialized for (to detect when circle prop changes)
let initializedForCircleId = $state<string | null | undefined>(undefined);

// Initialize/re-initialize form when circle prop changes
$effect(() => {
  const circleId = circle?.id ?? null;
  if (initializedForCircleId !== circleId) {
    formName = circle?.name ?? '';
    formColor = circle?.color ?? CIRCLE_COLORS[5];
    formParentId = circle?.parentCircleId ?? null;
    formError = '';
    initializedForCircleId = circleId;
  }
});

// Mark modal as open for keyboard shortcut handling
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

// Focus the name input when the modal opens
$effect(() => {
  if (nameInputRef) {
    nameInputRef.focus();
  }
});

// Get valid parent options (exclude the current circle and its children to prevent circular references)
function getParentOptionsTree(): Array<{ circle: Circle; depth: number }> {
  const currentCircleId = circle?.id ?? null;

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

    if (isEditing && circle) {
      await circles.updateCircle(circle.id, input);
    } else {
      await circles.createCircle(input);
    }

    onClose();
  } catch (err) {
    formError = (err as Error)?.message || 'Failed to save circle';
  } finally {
    isSubmitting = false;
  }
}

// Check if form has unsaved changes
function isDirty(): boolean {
  if (isEditing) {
    return (
      formName !== circle?.name ||
      formColor !== circle?.color ||
      formParentId !== circle?.parentCircleId
    );
  }
  return formName.trim() !== '';
}

function handleClose() {
  if (isSubmitting) return;

  if (isDirty()) {
    showUnsavedWarning = true;
  } else {
    onClose();
  }
}

function confirmClose() {
  showUnsavedWarning = false;
  onClose();
}

function cancelClose() {
  showUnsavedWarning = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showUnsavedWarning) {
      cancelClose();
    } else {
      handleClose();
    }
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="circle-modal-title"
  tabindex="-1"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
      <h2 id="circle-modal-title" class="text-xl font-heading text-gray-900">
        {isEditing ? 'Edit Circle' : 'New Circle'}
      </h2>
      <button
        type="button"
        onclick={handleClose}
        disabled={isSubmitting}
        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100
               disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="flex flex-col flex-1 overflow-hidden">
      <!-- Scrollable content area -->
      <div class="p-4 space-y-4 overflow-y-auto flex-1">
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
            {#each getParentOptionsTree() as { circle: parentCircle, depth }}
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

        <!-- Error message -->
        {#if formError}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {formError}
          </div>
        {/if}
      </div>

      <!-- Footer buttons (fixed) -->
      <div class="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onclick={handleClose}
          disabled={isSubmitting}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
                 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          class="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold
                 hover:bg-forest-light transition-colors disabled:opacity-50
                 flex items-center justify-center gap-2"
        >
          {#if isSubmitting}
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Saving...
          {:else}
            {isEditing ? 'Save Changes' : 'Create Circle'}
          {/if}
        </button>
      </div>
    </form>

    <!-- Unsaved changes warning overlay -->
    {#if showUnsavedWarning}
      <div class="absolute inset-0 bg-white bg-opacity-95 rounded-xl flex items-center justify-center p-6">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-lg font-heading text-gray-900 mb-2">Unsaved Changes</h3>
          <p class="text-gray-600 font-body mb-6">You have unsaved changes. Are you sure you want to close?</p>
          <div class="flex gap-3 justify-center">
            <button
              type="button"
              onclick={cancelClose}
              class="px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Keep Editing
            </button>
            <button
              type="button"
              onclick={confirmClose}
              class="px-4 py-2 bg-amber-500 text-white rounded-lg font-body font-semibold hover:bg-amber-600 transition-colors"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
