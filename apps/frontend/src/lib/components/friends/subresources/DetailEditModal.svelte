<script lang="ts">
import type { Snippet } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

interface Props {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
  isDirty?: boolean;
  onSave: () => void;
  onClose: () => void;
  children: Snippet;
}

let {
  title,
  subtitle,
  isLoading = false,
  error = null,
  isDirty = false,
  onSave,
  onClose,
  children,
}: Props = $props();

// Mark modal as open for keyboard shortcut handling
$effect(() => {
  isModalOpen.set(true);
  return () => isModalOpen.set(false);
});

function handleClose() {
  if (isDirty && !isLoading) {
    if (confirm($i18n.t('subresources.common.unsavedChanges'))) {
      onClose();
    }
  } else if (!isLoading) {
    onClose();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose();
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose();
  }
}

function handleSubmit(e: Event) {
  e.preventDefault();
  onSave();
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
  aria-labelledby="edit-modal-title"
  tabindex="-1"
>
  <!-- Modal content -->
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
      <div>
        <h2 id="edit-modal-title" class="text-xl font-heading text-gray-900">
          {title}
        </h2>
        {#if subtitle}
          <p class="text-sm text-gray-500 font-body">{subtitle}</p>
        {/if}
      </div>
      <button
        type="button"
        onclick={handleClose}
        disabled={isLoading}
        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100
               disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={$i18n.t('subresources.common.close')}
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
        {@render children()}

        <!-- Error message -->
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        {/if}
      </div>

      <!-- Footer buttons (fixed) -->
      <div class="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onclick={handleClose}
          disabled={isLoading}
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-body font-semibold
                 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {$i18n.t('subresources.common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          class="flex-1 px-4 py-2 bg-forest text-white rounded-lg font-body font-semibold
                 hover:bg-forest-light transition-colors disabled:opacity-50
                 flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {$i18n.t('subresources.common.saving')}
          {:else}
            {$i18n.t('subresources.common.save')}
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
