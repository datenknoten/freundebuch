<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  /** The variant/type of alert */
  variant: 'error' | 'success' | 'warning' | 'info';
  /** Content to display in the alert */
  children: Snippet;
}

let { variant, children }: Props = $props();

const variantClasses = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
</script>

<div
  class="border px-4 py-3 rounded-lg font-body text-sm {variantClasses[variant]}"
  role="alert"
>
  {@render children()}
</div>
