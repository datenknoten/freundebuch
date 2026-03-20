<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';

interface Props {
  title: string;
  prefix: string | null;
  variant?: 'default' | 'danger';
  itemDescription: string;
}

let { title, prefix, variant = 'default', itemDescription }: Props = $props();

const i18n = createI18n();
const isDanger = $derived(variant === 'danger');
</script>

<div class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden min-w-48">
  <div class="{isDanger ? 'bg-red-50 border-b border-red-200' : 'bg-gray-50 border-b border-gray-200'} px-3 py-2">
    <span class="text-sm font-medium {isDanger ? 'text-red-700' : 'text-gray-700'}">
      {title}{prefix ? ` (${prefix}...)` : '...'}
    </span>
    <span class="text-xs {isDanger ? 'text-red-500' : 'text-gray-500'} ml-2">
      {#if prefix}
        {$i18n.t('shortcuts.panels.press19OrEsc')}
      {:else}
        {$i18n.t('shortcuts.panels.press19AzOrEsc')}
      {/if}
    </span>
  </div>
  <div class="p-3 font-body text-sm {isDanger ? 'text-red-600' : 'text-gray-600'}">
    {#if prefix}
      {$i18n.t('shortcuts.panels.pressNumberComplete', { prefix })}
    {:else}
      {$i18n.t('shortcuts.panels.pressKeyShown', { item: itemDescription })}
    {/if}
  </div>
</div>
