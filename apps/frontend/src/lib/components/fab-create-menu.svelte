<script lang="ts" module>
import { flushSync } from 'svelte';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { openWithKeyboard } from '$lib/actions/auto-focus';

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
        // The caller has already closed this menu. Flush that first so the
        // menu's teardown (which clears the global `isModalOpen` flag) runs
        // before the modal mounts and sets it — otherwise the flag would end
        // up false behind an open modal, leaving keyboard shortcuts active.
        flushSync();
        // Then open the modal, still inside the FAB tap, so its auto-focused
        // name input claims the mobile keyboard. The page's event handler
        // cannot flush itself: it is also reachable from keyboard shortcuts.
        openWithKeyboard(() => window.dispatchEvent(new CustomEvent('shortcut:new-circle')));
      } else {
        goto('/circles?new=1');
      }
      break;
  }
}
</script>

<script lang="ts">
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Calendar from 'svelte-heros-v2/Calendar.svelte';
import DocumentText from 'svelte-heros-v2/DocumentText.svelte';
import Swatch from 'svelte-heros-v2/Swatch.svelte';
import UserPlus from 'svelte-heros-v2/UserPlus.svelte';
import Button from '$lib/components/ui/button.svelte';
import Modal from '$lib/components/ui/modal.svelte';
import { createI18n } from '$lib/i18n/index.js';

const i18n = createI18n();

interface Props {
  onSelect: (choice: FabCreateChoice) => void;
  onClose: () => void;
  /**
   * When provided, a contextual "Add detail" entry is shown at the top of the
   * menu (used on friend/collective detail pages to add a sub-resource to the
   * entity currently open). Omitted on non-detail pages, where the menu only
   * offers the create-new options.
   */
  onAddDetail?: () => void;
}

let { onSelect, onClose, onAddDetail }: Props = $props();

const options: { choice: FabCreateChoice; icon: typeof UserPlus; labelKey: string }[] = [
  { choice: 'friend', icon: UserPlus, labelKey: 'shortcuts.newFriend' },
  { choice: 'encounter', icon: Calendar, labelKey: 'shortcuts.newEncounter' },
  { choice: 'circle', icon: Swatch, labelKey: 'shortcuts.newCircle' },
  { choice: 'collective', icon: BuildingOffice, labelKey: 'shortcuts.newCollective' },
];
</script>

<Modal title={$i18n.t('common.createNew')} variant="sheet" {onClose}>
  <div class="space-y-3">
    {#if onAddDetail}
      <button
        type="button"
        onclick={onAddDetail}
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
    {/if}

    {#each options as option (option.choice)}
      {@const Icon = option.icon}
      <button
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

  <Button variant="ghost" block class="mt-4" onclick={onClose}>
    {$i18n.t('common.cancel')}
  </Button>
</Modal>
