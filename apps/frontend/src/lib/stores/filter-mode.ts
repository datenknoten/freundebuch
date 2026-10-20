import { writable } from 'svelte/store';
import { HintModeStore } from './hint-mode.js';

/** The hint mode of the friends filter: a category key first, then the hint of a value. */
export class FilterModeStore extends HintModeStore {
  /** The facet field picked by its category key; `null` waits for the category. */
  public readonly category = writable<string | null>(null);

  public override reset() {
    super.reset();
    this.category.set(null);
  }
}
