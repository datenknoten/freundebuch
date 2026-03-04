import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';
import {
  deleteCircleModePrefix,
  editCircleModePrefix,
  getIndexFromHint,
  ITEMS_PER_GROUP,
  visibleCircleIds,
} from '$lib/stores/ui';
import type { HandlerContext } from '../types.js';

function handleCircleAction(
  e: KeyboardEvent,
  ctx: HandlerContext,
  prefixStore: Writable<string | null>,
  eventName: string,
): boolean {
  const circleIds = get(visibleCircleIds);
  const currentPrefix = get(prefixStore);
  const keyNum = parseInt(e.key, 10);
  const keyLower = e.key.toLowerCase();

  // If we already have a letter prefix, we're waiting for a number
  if (currentPrefix) {
    if (keyNum >= 1 && keyNum <= 9) {
      e.preventDefault();
      const index = getIndexFromHint(`${currentPrefix}${keyNum}`);
      if (index >= 0 && index < circleIds.length) {
        ctx.clearPending();
        window.dispatchEvent(
          new CustomEvent(eventName, { detail: { circleId: circleIds[index] } }),
        );
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
    if (index < circleIds.length) {
      ctx.clearPending();
      window.dispatchEvent(new CustomEvent(eventName, { detail: { circleId: circleIds[index] } }));
    }
    return true;
  }

  // Check if it's a letter for extended navigation
  if (keyLower >= 'a' && keyLower <= 'z') {
    const letterIndex = keyLower.charCodeAt(0) - 97;
    const groupStartIndex = (letterIndex + 1) * ITEMS_PER_GROUP;

    if (groupStartIndex < circleIds.length) {
      e.preventDefault();
      prefixStore.set(keyLower);
      return true;
    }
  }

  ctx.clearPending();
  return true;
}

export function handleCircleMode(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pathname !== '/circles') return false;

  if (ctx.pendingKey === 'e') {
    return handleCircleAction(e, ctx, editCircleModePrefix, 'shortcut:edit-circle');
  }

  if (ctx.pendingKey === 'd') {
    return handleCircleAction(e, ctx, deleteCircleModePrefix, 'shortcut:delete-circle');
  }

  return false;
}
