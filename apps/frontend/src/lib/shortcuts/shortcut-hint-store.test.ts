import { get, writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutHintStore } from './shortcut-hint-store.js';

const SESSION_KEY = 'freundebuch-shortcut-hints-shown';

function createHints(isEnabled = true) {
  return new ShortcutHintStore({ showShortcutHints: writable(isEnabled) });
}

function clickOn(target: Element, detail = 1) {
  const event = new MouseEvent('click', { bubbles: true, detail });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

function appendButton(shortcut: string, label?: string) {
  const button = document.createElement('button');
  button.dataset.shortcut = shortcut;
  if (label !== undefined) {
    button.dataset.shortcutLabel = label;
  }
  document.body.appendChild(button);
  return button;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShortcutHintStore', () => {
  describe('show', () => {
    it('sets the active hint with its keys and label', () => {
      const hints = createHints();

      hints.show('g f', 'shortcuts.goFriends');

      expect(get(hints)).toMatchObject({ keys: 'g f', labelKey: 'shortcuts.goFriends' });
    });

    it('shows each chord only once per session', () => {
      const hints = createHints();
      hints.show('g f');
      hints.dismiss();

      hints.show('g f');

      expect(get(hints)).toBeNull();
    });

    it('dedupes chords independently of each other', () => {
      const hints = createHints();
      hints.show('g f');
      hints.dismiss();

      hints.show('o 3');

      expect(get(hints)?.keys).toBe('o 3');
    });

    it('stays silent while the user has shortcut hints disabled', () => {
      const hints = createHints(false);

      hints.show('g f');

      expect(get(hints)).toBeNull();
    });

    it('ignores an empty chord', () => {
      const hints = createHints();

      hints.show('');

      expect(get(hints)).toBeNull();
    });
  });

  describe('across page loads', () => {
    it('remembers the shown chords in sessionStorage', () => {
      createHints().show('g f');
      const hints = createHints();

      hints.show('g f');

      expect(get(hints)).toBeNull();
    });

    it('starts afresh when the stored chords are malformed', () => {
      sessionStorage.setItem(SESSION_KEY, '{"g f":true}');
      const hints = createHints();

      hints.show('g f');

      expect(get(hints)?.keys).toBe('g f');
    });
  });

  describe('handleClick', () => {
    it('shows the hint of the clicked data-shortcut element', () => {
      const hints = createHints();

      hints.handleClick(clickOn(appendButton('n f', 'shortcuts.newFriend')));

      expect(get(hints)).toMatchObject({ keys: 'n f', labelKey: 'shortcuts.newFriend' });
    });

    it('resolves data-shortcut from an ancestor of the clicked element', () => {
      const hints = createHints();
      const row = document.createElement('tr');
      row.dataset.shortcut = 'o 3';
      const cell = document.createElement('td');
      row.appendChild(cell);
      document.body.appendChild(row);

      hints.handleClick(clickOn(cell));

      expect(get(hints)?.keys).toBe('o 3');
    });

    it('skips keyboard-activated synthetic clicks (detail === 0)', () => {
      const hints = createHints();

      hints.handleClick(clickOn(appendButton('g f'), 0));

      expect(get(hints)).toBeNull();
    });

    it('skips an element whose data-shortcut is empty', () => {
      const hints = createHints();

      hints.handleClick(clickOn(appendButton('')));

      expect(get(hints)).toBeNull();
    });

    it('ignores a click outside any data-shortcut element', () => {
      const hints = createHints();
      const div = document.createElement('div');
      document.body.appendChild(div);

      hints.handleClick(clickOn(div));

      expect(get(hints)).toBeNull();
    });
  });
});
