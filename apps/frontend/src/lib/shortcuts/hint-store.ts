import { get, writable } from 'svelte/store';
import { showShortcutHints } from '$lib/stores/auth';

/** A shortcut hint toast triggered by a mouse-driven action */
export interface ActiveHint {
  /** Space-separated key chord, e.g. "g f", "o 3", "a p" */
  keys: string;
  /** Optional i18n key describing the action, e.g. "shortcuts.goFriends" */
  labelKey?: string;
  /** Monotonic id so re-showing retriggers the dismiss timer */
  id: number;
}

const SESSION_KEY = 'freundebuch-shortcut-hints-shown';

function loadShown(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    // sessionStorage unavailable (SSR, private mode) — in-memory Set still dedupes
    return new Set();
  }
}

const shown = loadShown();
let counter = 0;

export const activeHint = writable<ActiveHint | null>(null);

function persistShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...shown]));
  } catch {
    // Ignore — dedupe falls back to the in-memory Set
  }
}

/**
 * Show a hint toast for a shortcut, once per session per chord.
 * No-op when the user disabled shortcut hints in their preferences.
 */
export function showShortcutHint(keys: string, labelKey?: string): void {
  if (!keys) return;
  if (!get(showShortcutHints)) return;
  if (shown.has(keys)) return;
  shown.add(keys);
  persistShown();
  activeHint.set({ keys, labelKey, id: ++counter });
}

export function dismissHint(): void {
  activeHint.set(null);
}

/** Test-only: reset the once-per-session dedupe state */
export function resetShownHints(): void {
  shown.clear();
  persistShown();
}

/**
 * Global click handler: when a mouse click lands on (or inside) an element
 * with a data-shortcut attribute, show the hint toast for that shortcut.
 * Registered in the capture phase so it fires even when inner handlers
 * call stopPropagation().
 */
export function handleShortcutHintClick(event: MouseEvent): void {
  // Keyboard-activated buttons (Enter/Space) fire synthetic clicks with
  // detail === 0 — the user already knows the keyboard, skip the hint.
  if (event.detail === 0) return;

  const target = event.target instanceof Element ? event.target : null;
  const el = target?.closest<HTMLElement>('[data-shortcut]');
  const keys = el?.dataset.shortcut?.trim();
  // Empty data-shortcut means "no valid shortcut in this context"
  if (!el || !keys) return;

  showShortcutHint(keys, el.dataset.shortcutLabel || undefined);
}
