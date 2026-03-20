<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import { filterModeCategory, filterModePrefix } from '$lib/stores/ui';
import { FILTER_FIELD_I18N_KEYS, FILTER_PANEL_CATEGORIES } from '../config.js';

const i18n = createI18n();

const category = $derived($filterModeCategory);
const prefix = $derived($filterModePrefix);
const categoryLabel = $derived(
  category ? $i18n.t(FILTER_FIELD_I18N_KEYS[category] ?? category) : null,
);
</script>

<div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-64">
  <div class="bg-gray-50 px-3 py-2 border-b border-gray-200">
    <span class="text-sm font-medium text-gray-700">
      {#if category}
        {$i18n.t('shortcuts.panels.filter', { category: categoryLabel })}{prefix ? ` (${prefix}...)` : ''}
      {:else}
        {$i18n.t('shortcuts.panels.filterBy')}
      {/if}
    </span>
    <span class="text-xs text-gray-500 ml-2">
      {#if category}
        {#if prefix}
          {$i18n.t('shortcuts.panels.press19OrEsc')}
        {:else}
          {$i18n.t('shortcuts.panels.press19AzOrEscExit')}
        {/if}
      {:else}
        {$i18n.t('shortcuts.panels.pressKeyOrEsc')}
      {/if}
    </span>
  </div>
  {#if category}
    <div class="p-3 font-body text-sm text-gray-600">
      {#if prefix}
        {$i18n.t('shortcuts.panels.pressNumberComplete', { prefix })}
      {:else}
        {$i18n.t('shortcuts.panels.pressKeyShownFilter')}
      {/if}
    </div>
  {:else}
    <div class="p-2 space-y-1 font-body text-sm">
      {#each FILTER_PANEL_CATEGORIES as item}
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
          <span class="text-gray-700">{$i18n.t(item.labelKey)}</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">{item.key}</kbd>
        </div>
      {/each}
      <div class="border-t border-gray-200 mt-2 pt-2">
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-red-50">
          <span class="text-red-600">{$i18n.t('shortcuts.panels.clearAllFilters')}</span>
          <kbd class="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-600">x</kbd>
        </div>
      </div>
    </div>
  {/if}
</div>
