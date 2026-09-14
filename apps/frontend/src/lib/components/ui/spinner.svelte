<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** `current` inherits the surrounding text colour (buttons, links). */
  tone?: 'forest' | 'white' | 'current';
  /** Announced to assistive tech; defaults to the generic loading string. */
  label?: string;
  class?: string;
  /**
   * Hide the spinner from assistive tech, for the callers whose own element
   * already announces the state (`Button` sets `aria-busy`). Without it the
   * sr-only text joins the button's accessible name and the `status` role
   * announces on top of `aria-busy`.
   */
  'aria-hidden'?: 'true';
}

const i18n = createI18n();

let {
  size = 'md',
  tone = 'forest',
  label,
  class: className = '',
  'aria-hidden': ariaHidden,
}: Props = $props();

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' } as const;
const tones = { forest: 'text-forest', white: 'text-white', current: '' } as const;
</script>

<span
  role={ariaHidden === 'true' ? undefined : 'status'}
  aria-hidden={ariaHidden}
  class="inline-block shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin {sizes[
    size
  ]} {tones[tone]} {className}"
>
  {#if ariaHidden !== 'true'}
    <span class="sr-only">{label ?? $i18n.t('common.loading')}</span>
  {/if}
</span>
