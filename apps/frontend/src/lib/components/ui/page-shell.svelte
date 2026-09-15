<script lang="ts">
import type { Snippet } from 'svelte';
import ChevronLeft from 'svelte-heros-v2/ChevronLeft.svelte';
import { headingClasses, linkClasses, surfaceClasses } from './styles';

interface Props {
  /**
   * Width by page kind: list pages are wide, detail pages narrower, forms
   * narrower still, and auth/consent cards narrow.
   */
  width: 'list' | 'detail' | 'form' | 'narrow';
  /** Vertically centres the surface (auth screens). */
  centered?: boolean;
  title?: string;
  subtitle?: string;
  /**
   * Renders a back link above the title. The label is part of the pair: a
   * chevron on its own has no accessible name.
   */
  back?: { href: string; label: string };
  /** Buttons rendered opposite the title. */
  actions?: Snippet;
  children: Snippet;
}

let { width, centered = false, title, subtitle, back, actions, children }: Props = $props();

const widths = {
  list: 'max-w-7xl',
  detail: 'max-w-4xl',
  form: 'max-w-2xl',
  narrow: 'max-w-md',
} as const;

const hasHeader = $derived(title !== undefined || back !== undefined || actions !== undefined);
</script>

<div
  class="{widths[width]} w-full mx-auto px-4 pb-8 {centered
    ? 'flex-1 flex flex-col justify-center'
    : 'mt-8'}"
>
  <div class={surfaceClasses.page}>
    {#if hasHeader}
      <div class="mb-8">
        {#if back !== undefined}
          <a href={back.href} class="{linkClasses.back} mb-4">
            <ChevronLeft class="w-4 h-4" strokeWidth="2" />
            {back.label}
          </a>
        {/if}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {#if title !== undefined}
              <h1 class={headingClasses.page}>{title}</h1>
            {/if}
            {#if subtitle !== undefined}
              <p class="text-gray-600 font-body mt-1">{subtitle}</p>
            {/if}
          </div>
          {#if actions}
            <div class="flex flex-wrap items-center gap-3">{@render actions()}</div>
          {/if}
        </div>
      </div>
    {/if}

    {@render children()}
  </div>
</div>
