import { parseJson } from '@datenknoten/kit/schema';
import { type } from 'arktype';
import { get, type Readable, writable } from 'svelte/store';

/** A shortcut hint toast triggered by a mouse-driven action. */
export interface ActiveHint {
  /** Space-separated key chord, e.g. "g f", "o 3", "a p". */
  keys: string;
  /** i18n key describing the action, e.g. "shortcuts.goFriends". */
  labelKey?: string;
  /** Monotonic, so showing the same chord again re-arms the dismiss timer. */
  id: number;
}

export interface ShortcutHintStoreOptions {
  showShortcutHints: Readable<boolean>;
}

const SESSION_KEY = 'freundebuch-shortcut-hints-shown';
const ShownChordsSchema = type('string[]');

/** sessionStorage is unavailable during SSR and in some private modes; the in-memory set still dedupes. */
function loadShownChords() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw === null ? [] : parseJson(ShownChordsSchema, raw));
  } catch {
    return new Set<string>();
  }
}

function persistShownChords(chords: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...chords]));
  } catch {
    // The in-memory set keeps deduping without storage.
  }
}

/** Shows each shortcut chord once per browser session, after a mouse click on its element. */
export class ShortcutHintStore {
  public readonly subscribe: Readable<ActiveHint | null>['subscribe'];
  private readonly activeHint = writable<ActiveHint | null>(null);
  private readonly shownChords = loadShownChords();
  private readonly showShortcutHints: Readable<boolean>;
  private hintCount = 0;

  public constructor(options: ShortcutHintStoreOptions) {
    this.showShortcutHints = options.showShortcutHints;
    this.subscribe = this.activeHint.subscribe;
  }

  /** No-op for an empty chord, a chord shown before, or when the user disabled shortcut hints. */
  public show(keys: string, labelKey?: string) {
    if (
      keys === '' ||
      get(this.showShortcutHints) === false ||
      this.shownChords.has(keys) === true
    ) {
      return;
    }
    this.shownChords.add(keys);
    persistShownChords(this.shownChords);
    this.hintCount += 1;
    this.activeHint.set({ keys, labelKey, id: this.hintCount });
  }

  public dismiss() {
    this.activeHint.set(null);
  }

  /**
   * Shows the hint of the `[data-shortcut]` element the click landed on or in. An empty
   * `data-shortcut` means the element has no valid shortcut in this context.
   */
  public handleClick(event: MouseEvent) {
    // Keyboard-activated buttons (Enter/Space) fire synthetic clicks with
    // detail === 0: the user already knows the keyboard.
    if (event.detail === 0 || event.target instanceof Element === false) {
      return;
    }
    const element = event.target.closest<HTMLElement>('[data-shortcut]');
    const keys = element?.dataset.shortcut?.trim() ?? '';
    if (element === null || keys === '') {
      return;
    }
    const labelKey = element.dataset.shortcutLabel;
    this.show(keys, labelKey === '' ? undefined : labelKey);
  }
}
