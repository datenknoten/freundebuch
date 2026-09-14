/**
 * Test environment shims.
 *
 * jsdom implements `<dialog>` as a plain element: it parses the tag but ships
 * no `showModal()`/`close()`, so any component built on the native modal
 * dialog would throw on mount. The shim below is the minimal behaviour those
 * components rely on — the `open` attribute and the `close` event — so the
 * component itself does not have to carry a test-only code path.
 */

const dialog = globalThis.HTMLDialogElement?.prototype;

if (dialog !== undefined && typeof dialog.showModal !== 'function') {
  dialog.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialog.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialog.close = function close(this: HTMLDialogElement, returnValue?: string) {
    // Match the platform: closing a dialog that is not open is a no-op, and
    // the `close` event is queued as a task rather than dispatched inline.
    if (!this.hasAttribute('open')) return;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.removeAttribute('open');
    queueMicrotask(() => this.dispatchEvent(new Event('close')));
  };
}
