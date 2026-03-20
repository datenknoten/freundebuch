/**
 * Creates a dirty-tracking effect that calls `onchange` whenever the tracked
 * reactive values change, skipping the initial run.
 *
 * @param trackFn A function that reads the reactive state to track (just reference each field).
 * @param onchange Getter that returns the callback to invoke when any tracked value changes.
 *                 Using a getter ensures the latest callback is read reactively.
 *
 * @example
 * ```ts
 * createDirtyTracker(
 *   () => { url; urlType; label; },
 *   () => onchange,
 * );
 * ```
 */
export function createDirtyTracker(
  trackFn: () => void,
  onchange: () => (() => void) | undefined,
): void {
  let initialized = false;

  $effect(() => {
    trackFn();
    if (initialized) {
      onchange()?.();
    } else {
      initialized = true;
    }
  });
}
