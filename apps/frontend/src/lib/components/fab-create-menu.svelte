<script lang="ts" module>
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

export type FabCreateChoice = 'friend' | 'encounter' | 'circle' | 'collective';

/** Routes the user to the creation flow for the chosen entity. */
export function navigateForCreateChoice(choice: FabCreateChoice): void {
  switch (choice) {
    case 'friend':
      goto('/friends/new');
      break;
    case 'encounter':
      goto('/encounters/new');
      break;
    case 'collective':
      goto('/collectives/new');
      break;
    case 'circle':
      // Circles are created via a modal. Open it in place when already on /circles,
      // otherwise navigate there with a flag the circles page uses to auto-open it.
      if (get(page).url.pathname === '/circles') {
        window.dispatchEvent(new CustomEvent('shortcut:new-circle'));
      } else {
        goto('/circles?new=1');
      }
      break;
  }
}
</script>

<script lang="ts">
import { onMount } from 'svelte';
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import Swatch from 'svelte-heros-v2/Swatch.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';

const i18n = createI18n();

interface Props {
  onSelect: (choice: FabCreateChoice) => void;
  onClose: () => void;
}

let { onSelect, onClose }: Props = $props();

const options: { choice: FabCreateChoice; icon: typeof UserPlus; labelKey: string }[] = [
  { choice: 'friend', icon: UserPlus, labelKey: 'shortcuts.newFriend' },
  { choice: 'encounter', icon: Calendar, labelKey: 'shortcuts.newEncounter' },
  { choice: 'circle', icon: Swatch, labelKey: 'shortcuts.newCircle' },
  { choice: 'collective', icon: BuildingOffice, labelKey: 'shortcuts.newCollective' },
];

let modalRef = $state<HTMLDivElement | null>(null);
let optionButtons = $state<HTMLButtonElement[]>([]);
let cancelButton = $state<HTMLButtonElement | null>(null);

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
    const firstButton = optionButtons[0];
    if (!firstButton || !cancelButton) return;

    if (e.shiftKey && document.activeElement === firstButton) {
      e.preventDefault();
      cancelButton.focus();
    } else if (!e.shiftKey && document.activeElement === cancelButton) {
      e.preventDefault();
      firstButton.focus();
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
    aria-labelledby="fab-create-menu-title"
  >
    <div class="p-4">
      <h2 id="fab-create-menu-title" class="text-xl font-heading text-gray-900 mb-4 text-center">
        {$i18n.t('common.createNew')}
      </h2>

      <div class="space-y-3">
        {#each options as option, index (option.choice)}
          {@const Icon = option.icon}
          <button
            bind:this={optionButtons[index]}
            type="button"
            onclick={() => onSelect(option.choice)}
            class="w-full flex items-center gap-4 p-4 rounded-xl
                   bg-gray-50 hover:bg-forest/10 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            <div class="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
              <Icon class="w-6 h-6 text-forest" strokeWidth="2" />
            </div>
            <span class="text-base font-body font-semibold text-gray-900">
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
