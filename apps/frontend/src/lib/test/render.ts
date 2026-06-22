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
