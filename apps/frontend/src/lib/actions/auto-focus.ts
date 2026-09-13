/**
 * Mobile keyboard focus helpers.
 *
 * iOS only raises the on-screen keyboard for a `focus()` that runs inside the
 * user's gesture (tap/click). A modal that mounts its input on the next Svelte
 * flush therefore focuses too late — the gesture has unwound and the keyboard
 * stays closed. The remedy is to make the mount itself happen inside the
 * gesture: {@link openWithKeyboard} applies the state change and flushes it
 * synchronously, so the input mounts — and, via {@link autoFocus}, is focused —
 * while the tap is still being handled.
 *
 * (An earlier approach focused a throwaway input during the tap and handed
 * focus to the real input a frame later. iOS did not keep the keyboard open
 * across that hand-over, so it is gone.)
 */

import { flushSync } from 'svelte';

/**
 * Open a modal or view from a tap/click handler so that its auto-focused input
 * claims the on-screen keyboard. `open` makes the state change (e.g. sets the
 * flag the modal is rendered on); the pending update is then flushed
 * synchronously, still inside the gesture.
 *
 * Call this only from event handlers. Svelte does not allow a synchronous
 * flush from inside an effect (`onMount`, `$effect`), and non-gesture callers
 * (keyboard shortcuts, auto-open on navigation) have no keyboard to claim
 * anyway — they can set the state directly.
 */
export function openWithKeyboard(open: () => void): void {
  open();
  flushSync();
}

/**
 * Svelte action that focuses an element on mount.
 * Use with `use:autoFocus` on any focusable element.
 * Pass `false` to skip focusing.
 *
 * Focus happens synchronously: when the mount was triggered inside a tap (see
 * {@link openWithKeyboard}) this is the call that claims the mobile keyboard.
 * A frame later it is retried for elements that were not focusable yet at
 * mount time (e.g. still inside an intro transition).
 *
 * @example
 * <input use:autoFocus type="text" />
 * <input use:autoFocus={shouldFocus} type="text" />
 */
export function autoFocus(node: HTMLElement, enabled: boolean = true) {
  if (!enabled) return;

  node.focus();
  const frame = requestAnimationFrame(() => {
    if (document.activeElement !== node) node.focus();
  });

  return {
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
}
