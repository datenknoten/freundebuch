<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  /** The variant/type of alert */
  variant: 'error' | 'success' | 'warning' | 'info';
  /** Optional bold heading rendered above the message */
  title?: string;
  /** Content to display in the alert */
  children: Snippet;
}

let { variant, title, children }: Props = $props();

const variantClasses = {
  error: 'bg-red-50 border-red-200 border-l-red-500 text-red-800',
  success: 'bg-green-50 border-green-200 border-l-green-500 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 border-l-yellow-500 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 border-l-blue-500 text-blue-800',
};
</script>

<div
  class="border border-l-4 px-4 py-3 rounded-lg font-body text-sm {variantClasses[variant]}"
  role={variant === 'error' ? 'alert' : 'status'}
>
  {#if title !== undefined}
    <p class="font-semibold">{title}</p>
  {/if}
  {@render children()}
</div>
