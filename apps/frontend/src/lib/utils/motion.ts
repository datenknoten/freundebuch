/**
 * A Svelte JS transition's duration, honouring the OS motion preference.
 *
 * The CSS reduced-motion reset in `app.css` cannot reach these: Svelte plays
 * `transition:` directives through the Web Animations API, not CSS. Guarded so
 * it is a plain pass-through on the server and under jsdom.
 */
export function motionDuration(ms: number): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return ms;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}
