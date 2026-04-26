<script lang="ts">
import XMark from 'svelte-heros-v2/XMark.svelte';
import { createI18n } from '$lib/i18n/index.js';
import AddressMap from './address-map.svelte';

const i18n = createI18n();

interface Props {
  open: boolean;
  latitude: number;
  longitude: number;
  addressLabel: string;
  onClose: () => void;
}

let { open, latitude, longitude, addressLabel, onClose }: Props = $props();

let dialogEl: HTMLDialogElement;

// Drive the native <dialog> element from the `open` prop. Using showModal()
// gives us a real focus trap, ESC-to-close, and inert background for free.
$effect(() => {
  if (!dialogEl) return;
  if (open && !dialogEl.open) {
    dialogEl.showModal();
  } else if (!open && dialogEl.open) {
    dialogEl.close();
  }
});

function handleCancel(e: Event) {
  // Native ESC fires the cancel event — translate to onClose so parent state stays in sync.
  e.preventDefault();
  onClose();
}

function handleBackdropClick(e: MouseEvent) {
  // <dialog> click target is itself when the user clicks outside the inner panel.
  if (e.target === dialogEl) {
    onClose();
  }
}
</script>

<dialog
  bind:this={dialogEl}
  oncancel={handleCancel}
  onclick={handleBackdropClick}
  aria-labelledby="address-map-modal-title"
  class="p-0 rounded-xl shadow-2xl backdrop:bg-black/50 bg-white"
>
  <div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
    <h2 id="address-map-modal-title" class="text-lg font-heading text-gray-900 truncate pr-2">
      {addressLabel || $i18n.t('subresources.address.address')}
    </h2>
    <button
      type="button"
      onclick={onClose}
      class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
      aria-label={$i18n.t('subresources.common.close')}
    >
      <XMark class="w-5 h-5" strokeWidth="2" />
    </button>
  </div>

  <div class="p-4 flex-1 min-h-0">
    {#if open}
      <AddressMap {latitude} {longitude} {addressLabel} heightClass="h-full" />
    {/if}
  </div>
</dialog>

<style>
/* `display: flex` would override the UA's `display: none` on a closed
   <dialog>, so flex layout must only apply when the dialog is open.
   Tailwind preflight also zeros dialog margins, which breaks the UA's
   default centering for showModal() — restore it explicitly. */
dialog[open] {
  display: flex;
  flex-direction: column;
  margin: auto;
  width: 90vw;
  height: 90vh;
  max-width: none;
  max-height: none;
}
</style>
