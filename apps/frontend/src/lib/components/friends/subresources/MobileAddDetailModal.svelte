<script lang="ts">
import { onMount } from 'svelte';
import Briefcase from 'svelte-heros-v2/Briefcase.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import Envelope from 'svelte-heros-v2/Envelope.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Link from 'svelte-heros-v2/Link.svelte';
import MapPin from 'svelte-heros-v2/MapPin.svelte';
import Phone from 'svelte-heros-v2/Phone.svelte';
import Share from 'svelte-heros-v2/Share.svelte';
import Users from 'svelte-heros-v2/Users.svelte';
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
  { type: 'relationship', labelKey: 'relationshipSection.addRelationship', icon: 'heart' },
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

    // Guard clause to prevent errors if elements aren't ready
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
              <Phone class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'mail'}
              <Envelope class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'map-pin'}
              <MapPin class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'link'}
              <Link class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'calendar'}
              <Calendar class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'share'}
              <Share class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'users'}
              <Users class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'briefcase'}
              <Briefcase class="w-6 h-6 text-forest" strokeWidth="2" />
            {:else if option.icon === 'heart'}
              <Heart class="w-6 h-6 text-forest" strokeWidth="2" />
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
