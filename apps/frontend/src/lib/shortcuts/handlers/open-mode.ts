import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { getIndexFromHint, ITEMS_PER_GROUP } from '$lib/stores/ui';
import { OPEN_MODE_CONFIGS } from '../config.js';
import type { HandlerContext, OpenModeConfig } from '../types.js';

function findMatchingConfig(pathname: string): OpenModeConfig | undefined {
  return OPEN_MODE_CONFIGS.find((config) => {
    if (typeof config.routeMatch === 'string') {
      return pathname === config.routeMatch;
    }
    return config.routeMatch.test(pathname) && !pathname.endsWith('/new');
  });
}

export function handleOpenMode(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pendingKey !== 'o') return false;

  const config = findMatchingConfig(ctx.pathname);
  if (!config) {
    ctx.clearPending();
    return true;
  }

  const itemIds = get(config.itemIdsStore) as (string | { url: string })[];
  const currentPrefix = get(config.prefixStore);
  const keyNum = parseInt(e.key, 10);
  const keyLower = e.key.toLowerCase();

  // If we already have a letter prefix, we're waiting for a number
  if (currentPrefix) {
    if (keyNum >= 1 && keyNum <= 9) {
      e.preventDefault();
      const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
      if (index >= 0 && index < itemIds.length) {
        ctx.clearPending();
        if (config.dispatchEvent) {
          window.dispatchEvent(new CustomEvent(config.dispatchEvent, { detail: { index } }));
        } else {
          goto(`${config.basePath}/${itemIds[index]}`);
        }
      } else {
        ctx.clearPending();
      }
    } else {
      ctx.clearPending();
    }
    return true;
  }

  // No prefix yet - check if it's a number (1-9) or letter (a-z)
  if (keyNum >= 1 && keyNum <= 9) {
    e.preventDefault();
    const index = keyNum - 1;
    if (index < itemIds.length) {
      ctx.clearPending();
      if (config.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(config.dispatchEvent, { detail: { index } }));
      } else {
        goto(`${config.basePath}/${itemIds[index]}`);
      }
    }
    return true;
  }

  // Check if it's a letter for extended navigation
  if (keyLower >= 'a' && keyLower <= 'z') {
    const letterIndex = keyLower.charCodeAt(0) - 97;
    const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

    if (groupStartIndex < itemIds.length) {
      e.preventDefault();
      config.prefixStore.set(keyLower);
      return true;
    }
  }

  // Invalid key, clear pending state
  ctx.clearPending();
  return true;
}
