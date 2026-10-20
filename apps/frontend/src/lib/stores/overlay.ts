import { derived, writable } from 'svelte/store';

/**
 * The overlays (modal dialogs, sheets, the search panel, the mobile navigation drawer) that are
 * open. A count, not a flag: the blocking session-expiry dialog can mount on top of an open modal,
 * and whichever unmounts first would clear a flag while the other still covers the page —
 * re-arming global keyboard shortcuts behind it.
 */
export class OverlayStore {
  /** True while any overlay is open; keyboard shortcuts stay suppressed until the last one closes. */
  public readonly isAnyOpen;
  private readonly openCount = writable(0);

  public constructor() {
    this.isAnyOpen = derived(this.openCount, (count) => count > 0);
  }

  /** Registers an open overlay and returns its release function, which is safe to call twice. */
  public register() {
    const openCount = this.openCount;
    let isReleased = false;
    openCount.update((count) => count + 1);

    function release() {
      if (isReleased === true) {
        return;
      }
      isReleased = true;
      openCount.update((count) => Math.max(0, count - 1));
    }

    return release;
  }
}
