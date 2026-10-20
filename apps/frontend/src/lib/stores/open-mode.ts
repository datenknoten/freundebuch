import { writable } from 'svelte/store';
import { HintModeStore } from './hint-mode.js';

/** A hint mode that opens one of the items the current page lists, in display order. */
export class OpenModeStore<T> extends HintModeStore {
  /** At most 234 items have a hint (26 letter groups × 9 digits). */
  public readonly visibleItems = writable<T[]>([]);
}
