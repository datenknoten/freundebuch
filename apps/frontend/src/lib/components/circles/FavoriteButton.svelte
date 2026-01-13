<script lang="ts">
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
    <svg class={sizeClasses} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  {:else}
    <!-- Outline star -->
    <svg class={sizeClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  {/if}
</button>
