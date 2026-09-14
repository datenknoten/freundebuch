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
  /** Colour of the badge; 'danger' marks a destructive mode (delete-by-key). */
  tone?: 'forest' | 'danger';
}

let { index, isActive, prefix, variant = 'table-row', tone = 'forest' }: Props = $props();

const positionClasses = {
  'table-row': '-left-6 top-1/2 -translate-y-1/2 min-w-5 h-5',
  card: '-left-1 -top-1 min-w-6 h-6',
} as const;

const toneClasses = {
  forest: 'bg-forest text-white',
  danger: 'bg-red-600 text-white',
} as const;

let keyHint = $derived(getKeyboardHint(index));

let shouldShow = $derived.by(() => {
  if (!isActive) return false;
  if (keyHint.length === 0) return false;

  if (prefix === null) {
    // No prefix selected yet - show all hints
    return true;
  }

  // Prefix selected - only show hints that match this prefix
  return keyHint.length === 2 && keyHint[0] === prefix;
});
</script>

{#if shouldShow}
  <div
    class="absolute px-1 rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-md z-(--z-popover) {positionClasses[
      variant
    ]} {toneClasses[tone]}"
  >
    {keyHint}
  </div>
{/if}
