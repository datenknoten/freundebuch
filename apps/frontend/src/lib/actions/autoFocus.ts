/**
 * Svelte action that focuses an element on mount.
 * Use with `use:autoFocus` on any focusable element.
 *
 * @example
 * <input use:autoFocus type="text" />
 */
export function autoFocus(node: HTMLElement): void {
  node.focus();
}
