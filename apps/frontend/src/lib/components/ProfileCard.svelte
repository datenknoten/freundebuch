<script lang="ts">
import type { Snippet } from 'svelte';
import { FOCUS_RING } from '$lib/components/ui/focus-ring.js';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';

interface Props {
  href: string;
  title: string;
  description: string;
  status: string;
  icon: Snippet;
}

let { href, title, description, status, icon }: Props = $props();
</script>

<a
  {href}
  class="{SURFACE_CLASSES.cardInteractive} flex items-start gap-4 {FOCUS_RING}"
>
  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
    {@render icon()}
  </div>
  <div class="min-w-0">
    <h3 class="font-heading text-lg text-gray-900">{title}</h3>
    <p class="text-sm font-body text-gray-500 mt-0.5">{description}</p>
    <p class="text-sm font-body text-forest mt-2">{status}</p>
  </div>
</a>
