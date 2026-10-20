import { get } from 'svelte/store';
import type { ShortcutStores } from '../types.js';

export interface GuardOptions {
  toggleHelp: () => void;
  clearPending: () => void;
  isHelpOpen: boolean;
  stores: ShortcutStores;
}

export function isInputElement(target: HTMLElement) {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable === true
  );
}

/** Handles the keys that work everywhere; `suppress: true` means no other shortcut may run. */
export function handleGuards(e: KeyboardEvent, options: GuardOptions) {
  const { stores } = options;
  const isOverlayOpen = get(stores.overlay.isAnyOpen);
  const isAuthenticated = get(stores.isAuthenticated);

  // Behind an overlay (a modal dialog or the mobile drawer) the search panel
  // stays closed: it is a plain fixed element, so it would render underneath,
  // unfocusable, while the open search suppressed every other shortcut. The
  // event is still prevented: the browser's own Cmd+K focuses the URL bar.
  if ((e.metaKey === true || e.ctrlKey === true) && e.key === 'k') {
    e.preventDefault();
    if (isOverlayOpen === false && isAuthenticated === true) {
      stores.search.toggle();
    }
    return { suppress: true };
  }

  if (get(stores.search.isOpen) === true) {
    return { suppress: true };
  }

  if (e.target instanceof HTMLElement && isInputElement(e.target) === true) {
    if (e.key === 'Escape') {
      e.target.blur();
    }
    return { suppress: true };
  }

  if (isAuthenticated === false && e.key !== '?') {
    return { suppress: true };
  }

  // Escape is deliberately left alone while a modal is open: every modal is a
  // native <dialog> opened with showModal(), and the browser turns an
  // unprevented Escape into the `cancel` event the dialog listens for.
  if (isOverlayOpen === true) {
    return { suppress: true };
  }

  if (e.key === '?') {
    e.preventDefault();
    options.toggleHelp();
    return { suppress: true };
  }

  if (e.key === 'Escape') {
    if (options.isHelpOpen === true) {
      e.preventDefault();
      options.toggleHelp();
    }
    options.clearPending();
    return { suppress: true };
  }

  return { suppress: false };
}
