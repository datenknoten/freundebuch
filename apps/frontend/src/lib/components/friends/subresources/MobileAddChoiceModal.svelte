<script lang="ts">
import { onMount } from 'svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

export type AddChoice = 'friend' | 'detail';

interface Props {
  onSelect: (choice: AddChoice) => void;
  onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

let modalRef = $state<HTMLDivElement | null>(null);
let cancelButton = $state<HTMLButtonElement | null>(null);
let friendButton = $state<HTMLButtonElement | null>(null);
let detailButton = $state<HTMLButtonElement | null>(null);

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
    const firstFocusable = friendButton;
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
  friendButton?.focus();

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
    aria-labelledby="mobile-add-choice-modal-title"
  >
    <div class="p-4">
      <h2 id="mobile-add-choice-modal-title" class="text-xl font-heading text-gray-900 mb-4 text-center">
        {$i18n.t('subresources.common.add')}
      </h2>

      <div class="space-y-3">
        <!-- Add New Friend option -->
        <button
          bind:this={friendButton}
          type="button"
          onclick={() => onSelect('friend')}
          class="w-full flex items-center gap-4 p-4 rounded-xl
                 bg-gray-50 hover:bg-forest/10 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
        >
          <div class="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
            <UserPlus class="w-6 h-6 text-forest" strokeWidth="2" />
          </div>
          <div class="text-left">
            <span class="block text-base font-body font-semibold text-gray-900">
              {$i18n.t('friends.newFriend')}
            </span>
            <span class="block text-sm font-body text-gray-500">
              {$i18n.t('friends.newFriendSubtitle')}
            </span>
          </div>
        </button>

        <!-- Add Detail to current friend option -->
        <button
          bind:this={detailButton}
          type="button"
          onclick={() => onSelect('detail')}
          class="w-full flex items-center gap-4 p-4 rounded-xl
                 bg-gray-50 hover:bg-forest/10 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
        >
          <div class="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
            <DocumentText class="w-6 h-6 text-forest" strokeWidth="2" />
          </div>
          <div class="text-left">
            <span class="block text-base font-body font-semibold text-gray-900">
              {$i18n.t('friendDetail.addDetail')}
            </span>
            <span class="block text-sm font-body text-gray-500">
              {$i18n.t('friendDetail.addDetailSubtitle')}
            </span>
          </div>
        </button>
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
