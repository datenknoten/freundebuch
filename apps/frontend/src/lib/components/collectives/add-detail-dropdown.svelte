<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { detailDescriptors } from './subresource-descriptors';

const i18n = createI18n();

interface Props {
  /** Called with the window event that opens the chosen sub-resource's add modal. */
  onAdd: (shortcutEvent: string) => void;
}

let { onAdd }: Props = $props();
let isOpen = $state(false);
let buttonRef = $state<HTMLButtonElement | null>(null);
let menuRef = $state<HTMLDivElement | null>(null);

function handleSelect(shortcutEvent: string) {
  onAdd(shortcutEvent);
  isOpen = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen = false;
    buttonRef?.focus();
  }
}

function handleClickOutside(e: MouseEvent) {
  if (
    isOpen &&
    menuRef &&
    !menuRef.contains(e.target as Node) &&
    !buttonRef?.contains(e.target as Node)
  ) {
    isOpen = false;
  }
}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
  <button
    bind:this={buttonRef}
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-body font-semibold
           hover:bg-gray-50 transition-colors flex items-center gap-2"
    aria-expanded={isOpen}
    aria-haspopup="menu"
  >
    <ChevronDown class="w-4 h-4 transition-transform duration-150 {isOpen ? 'rotate-180' : ''}" strokeWidth="2" />
    <span>{$i18n.t('subresources.common.add')}</span>
  </button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg
             border border-gray-200 py-1 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      {#each detailDescriptors as descriptor (descriptor.key)}
        {@const Icon = descriptor.icon}
        <button
          type="button"
          onclick={() => handleSelect(descriptor.shortcutEvent)}
          class="w-full px-4 py-2 text-left text-sm font-body text-gray-700
                 hover:bg-gray-50 flex items-center gap-3 transition-colors"
          role="menuitem"
          data-shortcut={descriptor.addShortcut}
          data-shortcut-label={descriptor.addShortcutLabel}
        >
          <Icon class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t(`shortcuts.add.${descriptor.key}`)}
        </button>
      {/each}
    </div>
  {/if}
</div>
