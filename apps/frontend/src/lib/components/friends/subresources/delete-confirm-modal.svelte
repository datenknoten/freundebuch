<script lang="ts">
import Button from '$lib/components/ui/button.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

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
    error = err instanceof Error ? err.message : $i18n.t('subresources.common.failedToDelete');
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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-gray-900/50 z-(--z-overlay) flex items-center justify-center p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="delete-modal-title"
  tabindex="-1"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
    <h2 id="delete-modal-title" class="text-xl font-heading text-gray-900 mb-2">{title}</h2>
    <p class="text-gray-600 font-body mb-4">{description}</p>

    <!-- Item preview -->
    <div class="bg-gray-50 rounded-lg p-3 mb-4 font-body text-gray-700">
      {itemPreview}
    </div>

    <p class="text-sm text-gray-500 font-body mb-4">{$i18n.t('subresources.common.cannotBeUndone')}</p>

    <!-- Error message -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    {/if}

    <div class="flex gap-3">
      <Button
        variant="secondary"
        class="flex-1"
        disabled={isDeleting}
        onclick={onClose}
      >
        {$i18n.t('subresources.common.cancel')}
      </Button>
      <Button
        variant="danger"
        class="flex-1"
        loading={isDeleting}
        onclick={handleDelete}
      >
        {$i18n.t('subresources.common.delete')}
      </Button>
    </div>
  </div>
</div>
