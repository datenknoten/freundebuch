<script lang="ts">
import type { Component, Snippet } from 'svelte';

interface Props {
  icon: Component<{ class?: string; strokeWidth?: string }>;
  title: string;
  description?: string;
  /** Secondary line below the description ("try a different term"). */
  hint?: string;
  tone?: 'neutral' | 'error';
  /** Actions rendered below the copy. */
  children?: Snippet;
}

let { icon: Icon, title, description, hint, tone = 'neutral', children }: Props = $props();
</script>

<div class="text-center py-12 {tone === 'neutral' ? 'bg-gray-50 rounded-lg' : ''}">
  <Icon
    class="mx-auto h-12 w-12 {tone === 'error' ? 'text-red-400' : 'text-gray-400'}"
    strokeWidth="2"
  />
  <h3 class="mt-4 text-lg font-heading text-gray-900">{title}</h3>
  {#if description !== undefined}
    <p class="mt-2 text-sm text-gray-600 font-body">{description}</p>
  {/if}
  {#if hint !== undefined}
    <p class="mt-1 text-xs text-gray-400 font-body">{hint}</p>
  {/if}
  {#if children}
    <div class="mt-4 flex flex-wrap justify-center gap-3">{@render children()}</div>
  {/if}
</div>
