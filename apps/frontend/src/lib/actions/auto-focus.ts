/**
 * Mobile keyboard focus helpers.
 *
 * On iOS Safari the on-screen keyboard only opens when `.focus()` runs
 * synchronously inside a user gesture (tap/click). Modals and views mount their
 * input *after* the gesture has unwound, so focusing on mount is too late and
 * the keyboard stays closed. To work around this, a tap handler that will open
 * such a view calls {@link primeKeyboardFocus} synchronously: it focuses a
 * throwaway off-screen input during the gesture, claiming the keyboard. When the
 * real input mounts, the {@link autoFocus} action moves focus to it and the
 * keyboard stays open.
 */

let primedInput: HTMLInputElement | null = null;

function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
  );
}

/** Remove any input created by {@link primeKeyboardFocus}. */
function releasePrimedInput(): void {
  if (primedInput) {
    primedInput.remove();
    primedInput = null;
  }
}

/**
 * Call this synchronously inside a tap/click handler that opens a modal or view
 * whose input is auto-focused on mount. On touch devices it primes the
 * on-screen keyboard by focusing a throwaway off-screen input during the
 * gesture, so the keyboard stays open once focus transfers to the real input
 * (see {@link autoFocus}). It is a no-op on non-touch devices.
 */
export function primeKeyboardFocus(): void {
  if (!isTouchDevice()) return;
  releasePrimedInput();

  const input = document.createElement('input');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  // The element must stay focusable, so it can't use display:none or
  // visibility:hidden. A 16px font-size keeps iOS from auto-zooming.
  input.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;' +
    'margin:0;opacity:0;font-size:16px;pointer-events:none;z-index:-1;';
  document.body.appendChild(input);
  input.focus();
  primedInput = input;

  // Safety net: if no auto-focused input claims it (e.g. the target focuses
  // itself without the action), remove the throwaway input shortly after.
  setTimeout(() => {
    if (primedInput === input) releasePrimedInput();
  }, 1500);
}

/**
 * Svelte action that focuses an element on mount.
 * Use with `use:autoFocus` on any focusable element.
 * Pass `false` to skip focusing.
 *
 * Focus is deferred to the next animation frame so the element is laid out and
 * visible (e.g. inside a modal or transition) before focusing — this makes
 * autofocus reliable on mobile, where focusing a not-yet-painted element is a
 * silent no-op. If the keyboard was primed via {@link primeKeyboardFocus}, the
 * throwaway input is released once the real element takes focus.
 *
 * @example
 * <input use:autoFocus type="text" />
 * <input use:autoFocus={shouldFocus} type="text" />
 */
export function autoFocus(node: HTMLElement, enabled: boolean = true) {
  // A disabled autofocus must be a pure no-op: it must not touch the global
  // priming state, or a sibling non-autofocused field mounting first would
  // release the throwaway input before the intended field takes focus. Stale
  // primed inputs are handled by the timeout safety-net in primeKeyboardFocus().
  if (!enabled) return;

  const frame = requestAnimationFrame(() => {
    node.focus();
    releasePrimedInput();
  });

  return {
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
}
