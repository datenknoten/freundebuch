<script lang="ts">
import ChevronDown from 'svelte-heros-v2/ChevronDown.svelte';
import { Button, focusRing, surfaceClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { AddDetailOption } from './types';

const i18n = createI18n();

interface Props {
  options: AddDetailOption[];
  /** Called with the window event that opens the chosen sub-resource's add modal. */
  onAdd: (shortcutEvent: string) => void;
}

let { options, onAdd }: Props = $props();

let isOpen = $state(false);
let buttonRef = $state<HTMLElement | null>(null);
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
    menuRef !== null &&
    !menuRef.contains(e.target as Node) &&
    buttonRef?.contains(e.target as Node) !== true
  ) {
    isOpen = false;
  }
}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
  <Button
    bind:element={buttonRef}
    variant="secondary"
    onclick={() => (isOpen = !isOpen)}
    aria-expanded={isOpen}
    aria-haspopup="menu"
  >
    <ChevronDown class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}" strokeWidth="2" />
    <span>{$i18n.t('subresources.common.add')}</span>
  </Button>

  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute right-0 mt-2 w-56 z-(--z-popover) {surfaceClasses.popover}"
      role="menu"
      aria-orientation="vertical"
    >
      {#each options as option (option.key)}
        {@const Icon = option.icon}
        <button
          type="button"
          onclick={() => handleSelect(option.event)}
          class="w-full px-4 py-2 text-left text-sm font-body text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors {focusRing}"
          role="menuitem"
          data-shortcut={option.shortcut}
          data-shortcut-label={option.shortcutLabel ?? option.labelKey}
        >
          <Icon class="w-4 h-4 text-gray-400" strokeWidth="2" />
          {$i18n.t(option.labelKey)}
        </button>
      {/each}
    </div>
  {/if}
</div>
