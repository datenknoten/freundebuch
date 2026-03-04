import { get } from 'svelte/store';
import { isAuthenticated } from '$lib/stores/auth';
import { isSearchOpen, search } from '$lib/stores/search';
import { isModalOpen } from '$lib/stores/ui';

export function isInputElement(target: HTMLElement): boolean {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Handle global guard logic before any shortcut processing.
 * Returns true if the event was fully handled and the caller should return early.
 */
export function handleGuards(
  e: KeyboardEvent,
  callbacks: {
    toggleHelp: () => void;
    clearPending: () => void;
    showHelp: boolean;
  },
): { suppress: boolean } {
  // Handle Cmd/Ctrl+K to open global search (works even in inputs)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (get(isAuthenticated)) {
      search.toggle();
    }
    return { suppress: true };
  }

  // Don't handle other shortcuts if global search is open
  if (get(isSearchOpen)) {
    return { suppress: true };
  }

  // Ignore if user is typing in an input, textarea, or contenteditable
  const target = e.target as HTMLElement;
  if (isInputElement(target)) {
    if (e.key === 'Escape') {
      target.blur();
    }
    return { suppress: true };
  }

  // Don't handle shortcuts if not authenticated (except ?)
  if (!get(isAuthenticated) && e.key !== '?') {
    return { suppress: true };
  }

  // When a modal/form is open, only allow Escape to close it
  if (get(isModalOpen)) {
    if (e.key === 'Escape') {
      e.preventDefault();
      isModalOpen.set(false);
      window.dispatchEvent(new CustomEvent('shortcut:close-modal'));
    }
    return { suppress: true };
  }

  // Handle ? for help
  if (e.shiftKey && (e.key === '?' || e.key === '/')) {
    e.preventDefault();
    callbacks.toggleHelp();
    return { suppress: true };
  }

  // Handle Escape to close help / clear pending
  if (e.key === 'Escape') {
    if (callbacks.showHelp) {
      e.preventDefault();
      callbacks.toggleHelp();
    }
    callbacks.clearPending();
    return { suppress: true };
  }

  return { suppress: false };
}
