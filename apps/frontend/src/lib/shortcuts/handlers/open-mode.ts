import { get, type Readable } from 'svelte/store';
import { goto } from '$app/navigation';
import { findIndexFromHint } from '$lib/utils/find-index-from-hint.js';
import { hasHintGroup } from '$lib/utils/has-hint-group.js';
import { findOpenModeConfig } from '../find-open-mode-config.js';
import type { HandlerContext, OpenModeConfig, OpenModeItem } from '../types.js';

function openItem(config: OpenModeConfig, items: OpenModeItem[], index: number) {
  if (config.dispatchEvent !== undefined) {
    window.dispatchEvent(new CustomEvent(config.dispatchEvent, { detail: { index } }));
    return;
  }
  void goto(`${config.basePath}/${items[index]}`);
}

export function handleOpenMode(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pendingKey !== 'o') {
    return false;
  }
  const config = findOpenModeConfig(ctx.pathname);
  if (config === undefined) {
    ctx.clearPending();
    return true;
  }

  const mode = ctx.stores.keyboardModes[config.mode];
  const visibleItems: Readable<OpenModeItem[]> = mode.visibleItems;
  const items = get(visibleItems);
  const currentPrefix = get(mode.prefix);
  const keyNum = Number.parseInt(e.key, 10);
  const isDigitKey = keyNum >= 1 && keyNum <= 9;

  if (currentPrefix !== null && currentPrefix !== '') {
    if (isDigitKey === true) {
      e.preventDefault();
    }
    ctx.clearPending();
    const index = isDigitKey === true ? findIndexFromHint(`${currentPrefix}${keyNum}`) : undefined;
    if (index !== undefined && index < items.length) {
      openItem(config, items, index);
    }
    return true;
  }

  if (isDigitKey === true) {
    e.preventDefault();
    const index = keyNum - 1;
    if (index >= items.length) {
      return true;
    }
    ctx.clearPending();
    openItem(config, items, index);
    return true;
  }

  const keyLower = e.key.toLowerCase();
  if (keyLower >= 'a' && keyLower <= 'z' && hasHintGroup(keyLower, items.length) === true) {
    e.preventDefault();
    mode.prefix.set(keyLower);
    return true;
  }

  ctx.clearPending();
  return true;
}
