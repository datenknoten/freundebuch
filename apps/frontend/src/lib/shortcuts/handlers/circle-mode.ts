import { get } from 'svelte/store';
import type { HintModeStore } from '$lib/stores/hint-mode.js';
import { findIndexFromHint } from '$lib/utils/find-index-from-hint.js';
import { hasHintGroup } from '$lib/utils/has-hint-group.js';
import type { HandlerContext } from '../types.js';

function dispatchCircleAction(eventName: string, circleId: string | undefined) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { circleId } }));
}

function handleCircleAction(
  e: KeyboardEvent,
  ctx: HandlerContext,
  mode: HintModeStore,
  eventName: string,
) {
  const circleIds = get(ctx.stores.keyboardModes.visibleCircleIds);
  const currentPrefix = get(mode.prefix);
  const keyNum = Number.parseInt(e.key, 10);
  const isDigitKey = keyNum >= 1 && keyNum <= 9;

  if (currentPrefix !== null && currentPrefix !== '') {
    if (isDigitKey === true) {
      e.preventDefault();
    }
    ctx.clearPending();
    const index = isDigitKey === true ? findIndexFromHint(`${currentPrefix}${keyNum}`) : undefined;
    if (index !== undefined && index < circleIds.length) {
      dispatchCircleAction(eventName, circleIds[index]);
    }
    return true;
  }

  if (isDigitKey === true) {
    e.preventDefault();
    const index = keyNum - 1;
    if (index < circleIds.length) {
      ctx.clearPending();
      dispatchCircleAction(eventName, circleIds[index]);
    }
    return true;
  }

  const keyLower = e.key.toLowerCase();
  if (keyLower >= 'a' && keyLower <= 'z' && hasHintGroup(keyLower, circleIds.length) === true) {
    e.preventDefault();
    mode.prefix.set(keyLower);
    return true;
  }

  ctx.clearPending();
  return true;
}

export function handleCircleMode(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pathname !== '/circles') {
    return false;
  }
  const { keyboardModes } = ctx.stores;
  if (ctx.pendingKey === 'e') {
    return handleCircleAction(e, ctx, keyboardModes.editCircle, 'shortcut:edit-circle');
  }
  if (ctx.pendingKey === 'd') {
    return handleCircleAction(e, ctx, keyboardModes.deleteCircle, 'shortcut:delete-circle');
  }
  return false;
}
