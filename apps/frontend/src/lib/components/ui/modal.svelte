<script lang="ts">
import type { Snippet } from 'svelte';
import XMark from 'svelte-heros-v2/XMark.svelte';
import { createI18n } from '$lib/i18n/index.js';
import { isModalOpen } from '$lib/stores/ui';
import { focusRing, headingClasses, surfaceClasses } from './styles';

interface Props {
  title: string;
  subtitle?: string;
  /** Panel width: md = max-w-md, lg = max-w-lg, xl = max-w-xl. */
  size?: 'md' | 'lg' | 'xl';
  /** `sheet` renders a mobile bottom sheet instead of a centred panel. */
  variant?: 'center' | 'sheet';
  /** When false, Escape, the backdrop and the header X stop closing the modal. */
  closable?: boolean;
  /** Stretches the panel to 90vw/90vh (maps, images). */
  fullscreen?: boolean;
  onClose: () => void;
  footer?: Snippet;
  children: Snippet;
  /** Extra classes on the panel itself. */
  class?: string;
}

const i18n = createI18n();

let {
  title,
  subtitle,
  size = 'md',
  variant = 'center',
  closable = true,
  fullscreen = false,
  onClose,
  footer,
  children,
  class: className = '',
}: Props = $props();

const uid = $props.id();
const titleId = `modal-title-${uid}`;
const widths = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' } as const;

let dialogEl = $state<HTMLDialogElement | undefined>(undefined);

// Set once the teardown below closes the dialog, and never cleared: the
// platform queues the resulting `close` event as a task, so `handleClose`
// runs after teardown has finished and must still recognise it as ours.
let tearingDown = false;

// showModal() is what buys the focus trap, Escape handling and an inert
// background; the component is mounted only while the modal should be open, so
// the effect opens on mount and closes on teardown.
$effect(() => {
  const element = dialogEl;
  if (element === undefined) return;

  // Svelte detaches a destroyed block's DOM before running effect teardowns,
  // so `close()` below runs on a disconnected <dialog> and the platform skips
  // its own focus restore. Remember the opener and restore focus by hand.
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (!element.open) element.showModal();
  isModalOpen.set(true);

  return () => {
    if (element.open) {
      tearingDown = true;
      element.close();
    }
    isModalOpen.set(false);
    if (opener?.isConnected === true) opener.focus();
  };
});

function handleCancel(event: Event) {
  // Native Escape fires `cancel`; translate it so the parent's state stays in
  // sync (and swallow it entirely while the modal is not closable).
  event.preventDefault();
  if (closable) onClose();
}

function handleClose() {
  // The dialog closed without going through `cancel`: Chrome's close-watcher
  // anti-abuse rule makes a second Escape non-cancelable, and a script
  // `close()` or `<form method="dialog">` never fires `cancel` at all. Keep
  // component and dialog in agreement instead of leaving a mounted modal with
  // nothing visible and the overlay count stuck.
  if (tearingDown) return;
  if (closable) onClose();
  else dialogEl?.showModal();
}

function handleBackdropClick(event: MouseEvent) {
  // A click on the <dialog> itself is a click on the backdrop: the panel's own
  // content sits in child elements.
  if (closable && event.target === dialogEl) onClose();
}
</script>

<dialog
  bind:this={dialogEl}
  oncancel={handleCancel}
  onclose={handleClose}
  onclick={handleBackdropClick}
  aria-labelledby={titleId}
  class:sheet={variant === 'sheet'}
  class:fullscreen
  class="p-0 w-full {widths[size]} max-h-[90vh] {variant === 'sheet'
    ? `${surfaceClasses.sheet} animate-slide-up`
    : surfaceClasses.modal} backdrop:bg-gray-900/50 {className}"
>
  <div class="flex items-center justify-between gap-3 p-4 border-b border-gray-200 shrink-0">
    <div class="min-w-0">
      <h2 id={titleId} class="{headingClasses.widget} truncate">{title}</h2>
      {#if subtitle !== undefined}
        <p class="text-sm text-gray-500 font-body truncate">{subtitle}</p>
      {/if}
    </div>
    {#if closable}
      <button
        type="button"
        onclick={onClose}
        class="p-2 shrink-0 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors {focusRing}"
        aria-label={$i18n.t('common.close')}
      >
        <XMark class="w-5 h-5" strokeWidth="2" />
      </button>
    {/if}
  </div>

  <div class="p-4 overflow-y-auto flex-1">
    {@render children()}
  </div>

  {#if footer}
    <div class="p-4 border-t border-gray-200 shrink-0 flex gap-3">
      {@render footer()}
    </div>
  {/if}
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
}

/* A sheet sits flush against the bottom edge, so its last row would land under
   the home indicator without the safe-area inset. */
dialog[open].sheet {
  margin: auto auto 0;
  width: 100%;
  max-width: none;
  max-height: 80vh;
  padding-bottom: env(safe-area-inset-bottom);
}

dialog[open].fullscreen {
  width: 90vw;
  height: 90vh;
  max-width: none;
  max-height: none;
}
</style>
