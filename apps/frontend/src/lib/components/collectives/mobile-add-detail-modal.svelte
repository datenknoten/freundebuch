<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';
import { detailDescriptors } from './subresource-descriptors';

const i18n = createI18n();

interface Props {
  /** Called with the window event that opens the chosen sub-resource's add modal. */
  onSelect: (shortcutEvent: string) => void;
  onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

let modalRef = $state<HTMLDivElement | null>(null);
let cancelButton = $state<HTMLButtonElement | null>(null);
let optionButtons = $state<HTMLButtonElement[]>([]);

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    onClose();
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    onClose();
  }

  // Focus trapping
  if (e.key === 'Tab' && modalRef) {
    const firstFocusable = optionButtons[0];
    const lastFocusable = cancelButton;

    if (!firstFocusable || !lastFocusable) return;

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
}

onMount(() => {
  isModalOpen.set(true);
  optionButtons[0]?.focus();

  return () => {
    isModalOpen.set(false);
  };
});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:hidden"
  onclick={handleBackdropClick}
  role="presentation"
>
  <div
    bind:this={modalRef}
    class="w-full bg-white rounded-t-2xl shadow-xl animate-slide-up max-h-[80vh] overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="collective-mobile-add-modal-title"
  >
    <div class="p-4">
      <h2 id="collective-mobile-add-modal-title" class="text-xl font-heading text-gray-900 mb-4 text-center">
        {$i18n.t('subresources.common.add')}
      </h2>

      <div class="grid grid-cols-2 gap-3">
        {#each detailDescriptors as descriptor, index (descriptor.key)}
          {@const Icon = descriptor.icon}
          <button
            bind:this={optionButtons[index]}
            type="button"
            onclick={() => onSelect(descriptor.shortcutEvent)}
            class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl
                   bg-gray-50 hover:bg-forest/10 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            <Icon class="w-6 h-6 text-forest" strokeWidth="2" />
            <span class="text-sm font-body font-medium text-gray-700">
              {$i18n.t(`shortcuts.add.${descriptor.key}`)}
            </span>
          </button>
        {/each}
      </div>

      <button
        bind:this={cancelButton}
        type="button"
        onclick={onClose}
        class="w-full mt-4 py-3 text-center font-body font-semibold text-gray-600
               hover:bg-gray-100 rounded-xl transition-colors
               focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
      >
        {$i18n.t('common.cancel')}
      </button>
    </div>

    <!-- Safe area padding for iOS -->
    <div class="h-safe-area-inset-bottom"></div>
  </div>
</div>
