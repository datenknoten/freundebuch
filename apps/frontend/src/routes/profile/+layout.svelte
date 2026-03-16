<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<div class="min-h-screen bg-gray-50 p-4">
  <div class="max-w-7xl mx-auto mt-8">
    {@render children()}
  </div>
</div>
