<script lang="ts">
import type { Snippet } from 'svelte';

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
  class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md hover:border-forest/30"
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
