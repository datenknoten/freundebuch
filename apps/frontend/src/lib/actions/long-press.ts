interface LongPressParams {
  onShort: () => void;
  onLong: () => void;
  duration?: number;
}

const DEFAULT_DURATION = 500;
const MOVE_CANCEL_PX = 10;

/**
 * Svelte action distinguishing a short tap from a long press on a single element.
 * Long-press detection uses pointer events; the short action is driven by `click`
 * so keyboard activation (Enter/Space) and assistive tech work as expected. A
 * long press opens the secondary action and the synthesized click is suppressed,
 * so the gesture never double-triggers. The OS callout/context menu is suppressed
 * only while a touch/pen press is active, leaving desktop right-click intact.
 *
 * @example
 * <button use:longPress={{ onShort: () => goto('/x'), onLong: () => (menuOpen = true) }}>
 */
export function longPress(node: HTMLElement, params: LongPressParams) {
  let current = params;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
  let activePointerId: number | null = null;
  let activePointerType = '';
  let startX = 0;
  let startY = 0;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function endPress() {
    clearTimer();
    activePointerId = null;
  }

  function handlePointerDown(e: PointerEvent) {
    // Ignore secondary buttons (e.g. right-click) and additional pointers while
    // one is already being tracked (multi-touch / re-entrancy).
    if (e.button !== 0 || activePointerId !== null) return;
    clearTimer();
    activePointerId = e.pointerId;
    activePointerType = e.pointerType;
    longPressFired = false;
    startX = e.clientX;
    startY = e.clientY;
    timer = setTimeout(() => {
      timer = null;
      longPressFired = true;
      current.onLong();
    }, current.duration ?? DEFAULT_DURATION);
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId || !timer) return;
    if (
      Math.abs(e.clientX - startX) > MOVE_CANCEL_PX ||
      Math.abs(e.clientY - startY) > MOVE_CANCEL_PX
    ) {
      clearTimer();
    }
  }

  function handlePointerEnd(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    endPress();
  }

  function handleClick(e: MouseEvent) {
    // Suppress the click synthesized after a long press so it doesn't also fire onShort.
    if (longPressFired) {
      e.preventDefault();
      e.stopPropagation();
      longPressFired = false;
      return;
    }
    // Covers pointer taps (mouse/touch) and keyboard activation (Enter/Space).
    current.onShort();
  }

  function handleContextMenu(e: Event) {
    // Only block the OS long-press menu/callout during a touch/pen press;
    // leave desktop right-click and assistive tools untouched.
    if (
      activePointerId !== null &&
      (activePointerType === 'touch' || activePointerType === 'pen')
    ) {
      e.preventDefault();
    }
  }

  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('pointermove', handlePointerMove);
  node.addEventListener('pointerup', handlePointerEnd);
  node.addEventListener('pointercancel', handlePointerEnd);
  node.addEventListener('pointerleave', handlePointerEnd);
  node.addEventListener('click', handleClick);
  node.addEventListener('contextmenu', handleContextMenu);

  return {
    update(next: LongPressParams) {
      current = next;
    },
    destroy() {
      clearTimer();
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerup', handlePointerEnd);
      node.removeEventListener('pointercancel', handlePointerEnd);
      node.removeEventListener('pointerleave', handlePointerEnd);
      node.removeEventListener('click', handleClick);
      node.removeEventListener('contextmenu', handleContextMenu);
    },
  };
}
