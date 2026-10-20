import { get } from 'svelte/store';
import { findIndexFromHint } from '$lib/utils/find-index-from-hint.js';
import { FILTER_CATEGORY_KEYS } from '../config.js';
import type { HandlerContext } from '../types.js';

function dispatchFilterToggle(category: string, index: number) {
  window.dispatchEvent(new CustomEvent('shortcut:filter-toggle', { detail: { category, index } }));
}

/** Picks a value of the selected category; the mode stays on so several values can be toggled. */
function handleValueKey(e: KeyboardEvent, ctx: HandlerContext, category: string) {
  const { filter } = ctx.stores.keyboardModes;
  const keyNum = Number.parseInt(e.key, 10);
  const isDigitKey = keyNum >= 1 && keyNum <= 9;
  const currentPrefix = get(filter.prefix);

  if (currentPrefix !== null && currentPrefix !== '') {
    if (isDigitKey === true) {
      e.preventDefault();
      const index = findIndexFromHint(`${currentPrefix}${keyNum}`);
      if (index !== undefined) {
        dispatchFilterToggle(category, index);
      }
    }
    filter.prefix.set(null);
    return true;
  }

  if (isDigitKey === true) {
    e.preventDefault();
    dispatchFilterToggle(category, keyNum - 1);
    return true;
  }

  const keyLower = e.key.toLowerCase();
  if (keyLower.length === 1 && keyLower >= 'a' && keyLower <= 'z') {
    e.preventDefault();
    filter.prefix.set(keyLower);
    return true;
  }

  return false;
}

export function handleFilterMode(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pendingKey !== 'f') {
    return false;
  }
  const { filter } = ctx.stores.keyboardModes;
  const keyLower = e.key.toLowerCase();

  if (keyLower === 'x') {
    e.preventDefault();
    ctx.clearPending();
    window.dispatchEvent(new CustomEvent('shortcut:clear-filters'));
    return true;
  }

  const category = FILTER_CATEGORY_KEYS[keyLower];
  if (category !== undefined) {
    e.preventDefault();
    filter.isActive.set(true);
    filter.category.set(category);
    window.dispatchEvent(new CustomEvent('shortcut:filter-category', { detail: { category } }));
    return true;
  }

  const selectedCategory = get(filter.category);
  if (
    get(filter.isActive) === true &&
    selectedCategory !== null &&
    selectedCategory !== '' &&
    handleValueKey(e, ctx, selectedCategory) === true
  ) {
    return true;
  }

  ctx.clearPending();
  return true;
}
