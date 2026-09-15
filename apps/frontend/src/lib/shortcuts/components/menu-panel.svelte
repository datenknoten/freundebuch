<script lang="ts">
import { codeClasses } from '$lib/components/ui';
import { createI18n } from '$lib/i18n/index.js';
import type { MenuShortcut } from '../types.js';

interface Props {
  title: string;
  items: MenuShortcut[];
  dangerItem?: MenuShortcut;
}

let { title, items, dangerItem }: Props = $props();

const i18n = createI18n();
</script>

<div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-(--z-overlay) border border-gray-200 overflow-hidden min-w-48">
  <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
    <span class="text-sm font-medium text-gray-700">{title}</span>
    <span class="text-xs text-gray-500 ml-2">{$i18n.t('shortcuts.panels.pressKeyOrEsc')}</span>
  </div>
  <div class="p-2 space-y-1 font-body text-sm">
    {#each items as item}
      <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
        <span class="text-gray-700">{$i18n.t(item.labelKey)}</span>
        <kbd class={codeClasses.kbd}>{item.key}</kbd>
      </div>
    {/each}
    {#if dangerItem}
      <div class="border-t border-gray-200 mt-2 pt-2">
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-red-50">
          <span class="text-red-600">{$i18n.t(dangerItem.labelKey)}</span>
          <kbd class={codeClasses.kbdDanger}>{dangerItem.key}</kbd>
        </div>
      </div>
    {/if}
  </div>
</div>
