<script lang="ts">
import type { Snippet } from 'svelte';
import { focusRing } from './styles';

interface Props {
  onclick: () => void;
  /** Accessible name; also the desktop tooltip. */
  label: string;
  /** The icon to render inside the button. */
  children: Snippet;
}

let { onclick, label, children }: Props = $props();
</script>

<!-- Mobile-only floating action button. `touch-none` plus the webkit callout
     reset keep a long press from selecting text or opening the iOS share
     sheet, which would swallow the tap the create menu needs. -->
<button
  type="button"
  {onclick}
  class="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-forest text-white rounded-full shadow-lg
         hover:bg-forest-light transition-colors flex items-center justify-center z-(--z-fab)
         select-none touch-none [-webkit-touch-callout:none] {focusRing}"
  title={label}
  aria-label={label}
>
  {@render children()}
</button>
