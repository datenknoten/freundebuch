/**
 * Svelte action that focuses an element on mount.
 * Use with `use:autoFocus` on any focusable element.
 * Pass `false` to skip focusing.
 *
 * @example
 * <input use:autoFocus type="text" />
 * <input use:autoFocus={shouldFocus} type="text" />
 */
export function autoFocus(node: HTMLElement, enabled: boolean = true): void {
  if (enabled) node.focus();
}
