/**
 * Helpers for testing store update logic without standing up a full Svelte
 * store. Generalizes the `createMockUpdate()` recorder pattern previously
 * inlined in stores/store-action.test.ts.
 */

/**
 * Captures the sequence of states produced by driving a store-style
 * `update(fn)` function. Each call applies `fn` to the latest state (or
 * `initial` on the first call) and records the result.
 *
 *   const rec = createUpdateRecorder({ isLoading: false });
 *   await storeAction(rec.update, ...);
 *   expect(rec.last.isLoading).toBe(false);
 *   expect(rec.states[0].isLoading).toBe(true);
 */
export function createUpdateRecorder<T>(initial: T) {
  const states: T[] = [];
  const update = (fn: (state: T) => T): void => {
    const current = states.length > 0 ? states[states.length - 1] : initial;
    states.push(fn(current));
  };
  return {
    update,
    states,
    /** The most recently recorded state, or `initial` if none yet. */
    get last(): T {
      return states.length > 0 ? states[states.length - 1] : initial;
    },
  };
}
