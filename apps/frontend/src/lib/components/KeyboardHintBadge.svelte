<script lang="ts">
import { getKeyboardHint } from '$lib/stores/ui';

interface Props {
  /** 0-based index of the item in the list */
  index: number;
  /** Whether open mode is currently active */
  isActive: boolean;
  /** Current letter prefix in open mode (null = no prefix yet) */
  prefix: string | null;
  /** Position variant: 'table-row' for left-aligned in table, 'card' for top-left overlay on card */
  variant?: 'table-row' | 'card';
}

let { index, isActive, prefix, variant = 'table-row' }: Props = $props();

let keyHint = $derived(getKeyboardHint(index));

let shouldShow = $derived.by(() => {
  if (!isActive) return false;
  if (!keyHint) return false;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  return keyHint.length === 2 && keyHint[0] === prefix;
});
</script>

{#if shouldShow && keyHint}
  {#if variant === 'table-row'}
    <div class="absolute -left-6 top-1/2 -translate-y-1/2 min-w-5 h-5 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyHint}
    </div>
  {:else}
    <div class="absolute -left-1 -top-1 min-w-6 h-6 px-1 bg-forest text-white rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-10">
      {keyHint}
    </div>
  {/if}
{/if}
