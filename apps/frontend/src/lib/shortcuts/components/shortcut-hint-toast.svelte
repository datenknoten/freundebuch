<script lang="ts">
import { fly } from 'svelte/transition';
import { createI18n } from '$lib/i18n/index.js';
import { activeHint, dismissHint } from '../hint-store.js';

const i18n = createI18n();
const DISMISS_MS = 4500;

let timer: ReturnType<typeof setTimeout> | null = null;

// Re-arm the auto-dismiss timer whenever a new hint appears
$effect(() => {
  const hint = $activeHint;
  if (timer) clearTimeout(timer);
  timer = hint ? setTimeout(dismissHint, DISMISS_MS) : null;
  return () => {
    if (timer) clearTimeout(timer);
  };
});

let keyParts = $derived($activeHint ? $activeHint.keys.split(' ') : []);
</script>

{#if $activeHint}
  <div
    role="status"
    aria-live="polite"
    transition:fly={{ y: 16, duration: 200 }}
    class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden max-w-xs"
  >
    <div class="px-4 py-3 font-body text-sm text-gray-700">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="font-medium">{$i18n.t('shortcuts.hintToast.tip')}</span>
        {#each keyParts as part, i (i)}
          {#if i > 0}
            <span class="text-gray-400 text-xs">{$i18n.t('shortcuts.hintToast.then')}</span>
          {/if}
          <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">{part}</kbd>
        {/each}
      </div>
      {#if $activeHint.labelKey}
        <div class="mt-1 text-xs text-gray-500">{$i18n.t($activeHint.labelKey)}</div>
      {/if}
    </div>
  </div>
{/if}
