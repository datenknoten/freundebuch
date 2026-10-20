<script lang="ts">
import { fly } from 'svelte/transition';
import { CODE_CLASSES } from '$lib/components/ui/code-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import { motionDuration } from '$lib/utils/motion';
import type { ShortcutHintStore } from '../shortcut-hint-store.js';

interface Props {
  hints: ShortcutHintStore;
}

let { hints }: Props = $props();

const i18n = createI18n();
const DISMISS_MS = 4500;

function dismissHint() {
  hints.dismiss();
}

// Re-arms the auto-dismiss timer whenever a new hint appears.
function scheduleDismiss() {
  const timer = $hints === null ? undefined : setTimeout(dismissHint, DISMISS_MS);
  return function cancelDismiss() {
    clearTimeout(timer);
  };
}

$effect(scheduleDismiss);

let keyParts = $derived($hints === null ? [] : $hints.keys.split(' '));
</script>

{#if $hints !== null}
  <div
    role="status"
    aria-live="polite"
    transition:fly={{ y: 16, duration: motionDuration(200) }}
    class="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg z-(--z-overlay) border border-gray-200 overflow-hidden max-w-xs"
  >
    <div class="px-4 py-3 font-body text-sm text-gray-700">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="font-medium">{$i18n.t('shortcuts.hintToast.tip')}</span>
        {#each keyParts as part, i (i)}
          {#if i > 0}
            <span class="text-gray-400 text-xs">{$i18n.t('shortcuts.hintToast.then')}</span>
          {/if}
          <kbd class={CODE_CLASSES.kbd}>{part}</kbd>
        {/each}
      </div>
      {#if $hints.labelKey !== undefined}
        <div class="mt-1 text-xs text-gray-500">{$i18n.t($hints.labelKey)}</div>
      {/if}
    </div>
  </div>
{/if}
