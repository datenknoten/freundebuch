<script lang="ts">
import { isModalOpen } from '$lib/stores/ui';

interface Props {
  title: string;
  description: string;
  itemPreview: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

let { title, description, itemPreview, onConfirm, onClose }: Props = $props();

let isDeleting = $state(false);
let error = $state<string | null>(null);

// Mark modal as open for keyboard shortcut handling
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

async function handleDelete() {
  isDeleting = true;
  error = null;
  try {
    await onConfirm();
    onClose();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to delete';
    isDeleting = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !isDeleting) {
    onClose();
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget && !isDeleting) {
    onClose();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="delete-modal-title"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
    <h2 id="delete-modal-title" class="text-xl font-heading text-gray-900 mb-2">{title}</h2>
    <p class="text-gray-600 font-body mb-4">{description}</p>

    <!-- Item preview -->
    <div class="bg-gray-50 rounded-lg p-3 mb-4 font-body text-gray-700">
      {itemPreview}
    </div>

    <p class="text-sm text-gray-500 font-body mb-4">This action cannot be undone.</p>

    <!-- Error message -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    {/if}

    <div class="flex gap-3">
      <button
        type="button"
        onclick={onClose}
        disabled={isDeleting}
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
               text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleDelete}
        disabled={isDeleting}
        class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-body font-semibold
               hover:bg-red-700 transition-colors disabled:opacity-50
               flex items-center justify-center gap-2"
      >
        {#if isDeleting}
          <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Deleting...
        {:else}
          Delete
        {/if}
      </button>
    </div>
  </div>
</div>
