<script lang="ts">
import Star from 'svelte-heros-v2/Star.svelte';

interface Props {
  isFavorite: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Click handler */
  onclick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

let { isFavorite, size = 'md', onclick, disabled = false }: Props = $props();

let sizeClasses = $derived(
  {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size],
);

let buttonSizeClasses = $derived(
  {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  }[size],
);
</script>

<button
  type="button"
  class="rounded-full transition-colors {buttonSizeClasses} {isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'} {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  onclick={onclick}
  {disabled}
  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
>
  {#if isFavorite}
    <!-- Filled star -->
    <Star strokeWidth="2" />
  {:else}
    <!-- Outline star -->
    <Star strokeWidth="2" />
  {/if}
</button>
