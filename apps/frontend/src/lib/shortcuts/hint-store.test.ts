import { get, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth store so the preference can be toggled per test
const mockShowShortcutHints = writable(true);
vi.mock('$lib/stores/auth', () => ({
  showShortcutHints: mockShowShortcutHints,
}));

const { activeHint, dismissHint, handleShortcutHintClick, resetShownHints, showShortcutHint } =
  await import('./hint-store.js');

describe('showShortcutHint', () => {
  beforeEach(() => {
    mockShowShortcutHints.set(true);
    resetShownHints();
    dismissHint();
  });

  it('sets the active hint with keys and label', () => {
    showShortcutHint('g f', 'shortcuts.goFriends');

    const hint = get(activeHint);
    expect(hint).not.toBeNull();
    expect(hint?.keys).toBe('g f');
    expect(hint?.labelKey).toBe('shortcuts.goFriends');
  });

  it('shows each chord only once per session', () => {
    showShortcutHint('g f');
    dismissHint();
    showShortcutHint('g f');

    expect(get(activeHint)).toBeNull();
  });

  it('dedupes chords independently', () => {
    showShortcutHint('g f');
    dismissHint();
    showShortcutHint('o 3');

    expect(get(activeHint)?.keys).toBe('o 3');
  });

  it('does nothing when the preference is disabled', () => {
    mockShowShortcutHints.set(false);
    showShortcutHint('g f');

    expect(get(activeHint)).toBeNull();
  });

  it('persists shown chords to sessionStorage', () => {
    showShortcutHint('g f');

    const raw = sessionStorage.getItem('freundebuch-shortcut-hints-shown');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toContain('g f');
  });

  it('ignores empty keys', () => {
    showShortcutHint('');

    expect(get(activeHint)).toBeNull();
  });
});

describe('handleShortcutHintClick', () => {
  beforeEach(() => {
    mockShowShortcutHints.set(true);
    resetShownHints();
    dismissHint();
    document.body.innerHTML = '';
  });

  function clickEvent(target: Element, detail = 1): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, detail });
    Object.defineProperty(event, 'target', { value: target });
    return event;
  }

  it('shows a hint when clicking an element with data-shortcut', () => {
    const button = document.createElement('button');
    button.dataset.shortcut = 'n f';
    button.dataset.shortcutLabel = 'shortcuts.newFriend';
    document.body.appendChild(button);

    handleShortcutHintClick(clickEvent(button));

    const hint = get(activeHint);
    expect(hint?.keys).toBe('n f');
    expect(hint?.labelKey).toBe('shortcuts.newFriend');
  });

  it('resolves data-shortcut from an ancestor of the clicked element', () => {
    const row = document.createElement('tr');
    row.dataset.shortcut = 'o 3';
    const cell = document.createElement('td');
    row.appendChild(cell);
    document.body.appendChild(row);

    handleShortcutHintClick(clickEvent(cell));

    expect(get(activeHint)?.keys).toBe('o 3');
  });

  it('skips keyboard-activated synthetic clicks (detail === 0)', () => {
    const button = document.createElement('button');
    button.dataset.shortcut = 'g f';
    document.body.appendChild(button);

    handleShortcutHintClick(clickEvent(button, 0));

    expect(get(activeHint)).toBeNull();
  });

  it('skips elements with an empty data-shortcut attribute', () => {
    const button = document.createElement('button');
    button.dataset.shortcut = '';
    document.body.appendChild(button);

    handleShortcutHintClick(clickEvent(button));

    expect(get(activeHint)).toBeNull();
  });

  it('ignores clicks outside any data-shortcut element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    handleShortcutHintClick(clickEvent(div));

    expect(get(activeHint)).toBeNull();
  });
});
