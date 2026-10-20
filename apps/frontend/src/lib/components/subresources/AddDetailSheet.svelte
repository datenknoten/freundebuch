<script lang="ts">
import Button from '$lib/components/ui/Button.svelte';
import { FOCUS_RING } from '$lib/components/ui/focus-ring.js';
import Modal from '$lib/components/ui/Modal.svelte';
import { createI18n } from '$lib/i18n/i18n.js';
import type { AddDetailOption } from './types.js';

const i18n = createI18n();

interface Props {
  options: AddDetailOption[];
  /** Called with the window event that opens the chosen sub-resource's add modal. */
  onSelect: (shortcutEvent: string) => void;
  onClose: () => void;
}

let { options, onSelect, onClose }: Props = $props();
</script>

<Modal variant="sheet" title={$i18n.t('subresources.common.add')} {onClose}>
  <div class="grid grid-cols-2 gap-3">
    {#each options as option (option.key)}
      {@const Icon = option.icon}
      <button
        type="button"
        onclick={() => onSelect(option.event)}
        class="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-forest/10 transition-colors {FOCUS_RING}"
      >
        <Icon class="w-6 h-6 text-forest" strokeWidth="2" />
        <span class="text-sm font-body font-medium text-gray-700">{$i18n.t(option.labelKey)}</span>
      </button>
    {/each}
  </div>

  {#snippet footer()}
    <Button variant="ghost" block onclick={onClose}>{$i18n.t('common.cancel')}</Button>
  {/snippet}
</Modal>
