import { get } from 'svelte/store';
import {
  FILTER_CATEGORY_KEYS,
  filterModeCategory,
  filterModePrefix,
  getIndexFromHint,
  isFilterModeActive,
} from '$lib/stores/ui';
import type { HandlerContext } from '../types.js';

export function handleFilterMode(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pendingKey !== 'f') return false;

  const keyLower = e.key.toLowerCase();
  const category = FILTER_CATEGORY_KEYS[keyLower];

  // Handle 'x' to clear all filters
  if (keyLower === 'x') {
    e.preventDefault();
    ctx.clearPending();
    window.dispatchEvent(new CustomEvent('shortcut:clear-filters'));
    return true;
  }

  // Handle category selection
  if (category) {
    e.preventDefault();
    isFilterModeActive.set(true);
    filterModeCategory.set(category);
    window.dispatchEvent(new CustomEvent('shortcut:filter-category', { detail: { category } }));
    // Don't clear pending - stay in filter mode for value selection
    return true;
  }

  // If in filter mode (category selected), handle number/letter selection
  if (get(isFilterModeActive) && get(filterModeCategory)) {
    const keyNum = parseInt(e.key, 10);
    const currentPrefix = get(filterModePrefix);

    // If we already have a letter prefix, we're waiting for a number
    if (currentPrefix) {
      if (keyNum >= 1 && keyNum <= 9) {
        e.preventDefault();
        const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
        if (index >= 0) {
          window.dispatchEvent(
            new CustomEvent('shortcut:filter-toggle', {
              detail: { category: get(filterModeCategory), index },
            }),
          );
        }
        // Clear the prefix after selection (but stay in filter mode)
        filterModePrefix.set(null);
      } else {
        // Invalid key after letter prefix, clear prefix
        filterModePrefix.set(null);
      }
      return true;
    }

    // No prefix yet - check if it's a number (1-9) or letter (a-z)
    if (keyNum >= 1 && keyNum <= 9) {
      e.preventDefault();
      const index = keyNum - 1;
      window.dispatchEvent(
        new CustomEvent('shortcut:filter-toggle', {
          detail: { category: get(filterModeCategory), index },
        }),
      );
      return true;
    }

    // Check if it's a letter for extended navigation (not a category key)
    if (
      keyLower.length === 1 &&
      keyLower >= 'a' &&
      keyLower <= 'z' &&
      !FILTER_CATEGORY_KEYS[keyLower]
    ) {
      e.preventDefault();
      filterModePrefix.set(keyLower);
      return true;
    }
  }

  // Invalid key, clear pending state
  ctx.clearPending();
  return true;
}
