/**
 * Keep Tab focus inside a container.
 *
 * Native `<dialog>` opened with `showModal()` traps focus by itself, so this
 * action exists only for the surfaces that cannot be a modal dialog: the
 * permanently-mounted global search (which must stay in the DOM for the iOS
 * keyboard) and anything else that overlays the page without `showModal()`.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * `use:focusTrap={enabled}` — while `enabled` is true, Tab and Shift+Tab cycle
 * within the node instead of escaping to the page behind it.
 */
export function focusTrap(node: HTMLElement, enabled: boolean = true) {
  let active = enabled;

  function handleKeydown(event: KeyboardEvent) {
    if (!active || event.key !== 'Tab') return;

    const elements = focusable(node);
    if (elements.length === 0) return;

    const first = elements[0];
    const last = elements[elements.length - 1];

    // Focus sits outside the trapped set (a backdrop with tabindex="-1", or a
    // node that has since been removed): Tab would walk into the page behind.
    if (!node.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);

  return {
    update(next: boolean) {
      active = next;
    },
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    },
  };
}
