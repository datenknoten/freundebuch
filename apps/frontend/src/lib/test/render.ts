/**
 * Thin re-exports over `@testing-library/svelte` so component tests have a
 * single import surface and don't each reach into the library directly.
 *
 * Svelte 5 component testing is enabled by the `svelteTesting()` Vite plugin
 * (see vite.config.ts), which wires the browser resolve condition and
 * auto-cleanup under jsdom.
 */
export { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
// `tick()` flushes pending Svelte state updates before assertions.
export { tick } from 'svelte';

/**
 * Look up a form control by its `id`. Component tests assert against the id
 * the form actually renders, so a missing control fails with the id rather
 * than a null dereference several lines later.
 */
export function control(id: string): HTMLInputElement | HTMLSelectElement {
  const el = document.querySelector(`#${id}`);
  if (el === null) throw new Error(`no control with id ${id}`);
  return el as HTMLInputElement | HTMLSelectElement;
}

/** The text of the `<label for=id>` bound to {@link control}'s field. */
export function labelFor(id: string): string {
  const el = document.querySelector(`label[for="${id}"]`);
  if (el === null) throw new Error(`no label for ${id}`);
  return el.textContent ?? '';
}
