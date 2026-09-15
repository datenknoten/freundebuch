<script lang="ts">
import MagnifyingGlass from 'svelte-heros-v2/MagnifyingGlass.svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { autoFocus } from '$lib/actions/auto-focus';
import { createI18n } from '$lib/i18n/index.js';
import Spinner from './spinner.svelte';
import { focusRing, formClasses } from './styles';

interface Props {
  value: string;
  placeholder: string;
  ariaLabel: string;
  id?: string;
  /** Called by the clear button; omit to hide it. */
  onclear?: () => void;
  oninput?: (value: string) => void;
  /** Enter in the field (open the first result). */
  onsubmit?: () => void;
  autofocus?: boolean;
  /** Shows a spinner instead of the clear button while a search is in flight. */
  busy?: boolean;
  busyLabel?: string;
  /** `bind:element` for callers that focus the field from a shortcut. */
  element?: HTMLInputElement | null;
}

const i18n = createI18n();

let {
  value = $bindable(),
  placeholder,
  ariaLabel,
  id,
  onclear,
  oninput,
  onsubmit,
  busy = false,
  busyLabel,
  autofocus = false,
  element = $bindable(null),
}: Props = $props();

function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
  value = event.currentTarget.value;
  oninput?.(value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && onsubmit !== undefined) {
    event.preventDefault();
    onsubmit();
  }
}
</script>

<div class="relative">
  <MagnifyingGlass
    class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
    strokeWidth="2"
  />
  <input
    bind:this={element}
    use:autoFocus={autofocus}
    {id}
    type="text"
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
    {placeholder}
    class="w-full pl-12 pr-12 py-3 text-base font-body text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg {formClasses.inputFocus}"
    autocomplete="off"
    data-search-input
    aria-label={ariaLabel}
  />
  {#if busy}
    <Spinner
      size="md"
      label={busyLabel}
      class="absolute right-4 top-1/2 -translate-y-1/2"
    />
  {:else if onclear !== undefined && value.length > 0}
    <button
      type="button"
      onclick={onclear}
      class="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors {focusRing}"
      aria-label={$i18n.t('aria.clearSearch')}
    >
      <XMark class="w-5 h-5" strokeWidth="2" />
    </button>
  {/if}
</div>
