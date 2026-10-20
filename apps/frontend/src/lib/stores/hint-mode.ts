import { writable } from 'svelte/store';

/**
 * A keyboard hint mode: while active, items show hints and a key sequence picks one. `prefix` is
 * the letter typed so far (`'a'` of `a3`); `null` waits for a digit or a letter.
 */
export class HintModeStore {
  public readonly isActive = writable(false);
  public readonly prefix = writable<string | null>(null);

  public reset() {
    this.isActive.set(false);
    this.prefix.set(null);
  }
}
