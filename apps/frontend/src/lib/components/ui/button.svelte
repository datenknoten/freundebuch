<script lang="ts">
import type { Snippet } from 'svelte';
import Spinner from './spinner.svelte';
import { type ButtonSize, type ButtonVariant, buttonClasses } from './styles';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a SvelteKit link that looks and behaves like the button. */
  href?: string;
  type?: 'button' | 'submit';
  /** Submits the form with this id — for a submit button outside its form. */
  form?: string;
  /** Full-width button (form submits, drawer actions). */
  block?: boolean;
  /** Disables the button and renders a spinner before its label. */
  loading?: boolean;
  disabled?: boolean;
  onclick?: (event: MouseEvent) => void;
  title?: string;
  'aria-label'?: string;
  /** Popover/menu triggers. */
  'aria-expanded'?: boolean;
  'aria-haspopup'?: 'menu' | 'listbox' | 'dialog' | 'true';
  'aria-current'?: 'page' | 'true' | undefined;
  /** Toggle buttons (segmented controls, filter pills). */
  'aria-pressed'?: boolean;
  class?: string;
  /** `bind:element` for callers that need the node (click-outside checks). */
  element?: HTMLElement | null;
  children: Snippet;
  [key: `data-${string}`]: string | undefined;
}

let {
  variant = 'primary',
  size = 'md',
  href,
  type = 'button',
  form,
  block = false,
  loading = false,
  disabled = false,
  onclick,
  class: className = '',
  element = $bindable(null),
  children,
  ...rest
}: Props = $props();

const classes = $derived(
  `${buttonClasses(variant, size)}${block ? ' w-full' : ''}${className.length > 0 ? ` ${className}` : ''}`,
);
const spinnerSize = $derived(size === 'lg' ? 'md' : 'sm');
const inert = $derived(disabled || loading);

// A disabled `<button>` swallows clicks by itself, but an `<a href>` does not:
// the link variant has to refuse the navigation and the handler explicitly.
function handleClick(event: MouseEvent) {
  if (inert) {
    event.preventDefault();
    return;
  }
  onclick?.(event);
}
</script>

{#if href !== undefined}
  <a
    bind:this={element}
    {href}
    class={classes}
    aria-disabled={inert ? 'true' : undefined}
    aria-busy={loading ? 'true' : undefined}
    onclick={handleClick}
    {...rest}
  >
    {#if loading}<Spinner size={spinnerSize} tone="current" aria-hidden="true" />{/if}
    {@render children()}
  </a>
{:else}
  <button
    bind:this={element}
    {type}
    {form}
    class={classes}
    disabled={inert}
    aria-busy={loading ? 'true' : undefined}
    onclick={handleClick}
    {...rest}
  >
    {#if loading}<Spinner size={spinnerSize} tone="current" aria-hidden="true" />{/if}
    {@render children()}
  </button>
{/if}
