<script lang="ts">
import { onMount } from 'svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';
import type { SubresourceType } from './AddDetailDropdown.svelte';

const i18n = createI18n();

interface Props {
  onSelect: (type: SubresourceType) => void;
  onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

let modalRef = $state<HTMLDivElement | null>(null);
let cancelButton = $state<HTMLButtonElement | null>(null);
let optionButtons = $state<HTMLButtonElement[]>([]);

const optionConfig: { type: SubresourceType; labelKey: string; icon: string }[] = [
  { type: 'phone', labelKey: 'subresources.dropdown.phoneNumber', icon: 'phone' },
  { type: 'email', labelKey: 'subresources.dropdown.emailAddress', icon: 'mail' },
  { type: 'address', labelKey: 'subresources.dropdown.address', icon: 'map-pin' },
  { type: 'url', labelKey: 'subresources.dropdown.websiteUrl', icon: 'link' },
  { type: 'date', labelKey: 'subresources.dropdown.importantDate', icon: 'calendar' },
  { type: 'social', labelKey: 'subresources.dropdown.socialProfile', icon: 'share' },
  { type: 'circle', labelKey: 'subresources.dropdown.circle', icon: 'users' },
  { type: 'professional', labelKey: 'subresources.dropdown.employment', icon: 'briefcase' },
];

function handleSelect(type: SubresourceType) {
  onSelect(type);
}

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

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable?.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable?.focus();
    }
  }
}

function setOptionButton(el: HTMLButtonElement, index: number) {
  optionButtons[index] = el;
  return {
    destroy() {
      // cleanup if needed
    },
  };
}

onMount(() => {
  isModalOpen.set(true);
  // Focus the first button when modal opens
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
    aria-labelledby="mobile-add-modal-title"
  >
    <div class="p-4">
      <h2 id="mobile-add-modal-title" class="text-xl font-heading text-gray-900 mb-4 text-center">
        {$i18n.t('subresources.common.add')}
      </h2>

      <div class="grid grid-cols-2 gap-3">
        {#each optionConfig as option, index}
          <button
            use:setOptionButton={index}
            type="button"
            onclick={() => handleSelect(option.type)}
            class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl
                   bg-gray-50 hover:bg-forest/10 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            {#if option.icon === 'phone'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            {:else if option.icon === 'mail'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            {:else if option.icon === 'map-pin'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            {:else if option.icon === 'link'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            {:else if option.icon === 'calendar'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            {:else if option.icon === 'share'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            {:else if option.icon === 'users'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            {:else if option.icon === 'briefcase'}
              <svg class="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            {/if}
            <span class="text-sm font-body font-medium text-gray-700">
              {$i18n.t(option.labelKey)}
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
