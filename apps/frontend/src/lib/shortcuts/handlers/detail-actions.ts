import { get } from 'svelte/store';
import { COLLECTIVE_DETAIL_EVENTS, FRIEND_DETAIL_EVENTS } from '../config.js';
import { isDetailPath } from '../detail-path.js';
import type { HandlerContext } from '../types.js';

export function handleDetailActions(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pendingKey !== 'a') {
    return false;
  }
  ctx.clearPending();

  const isOnFriend =
    get(ctx.stores.currentFriend) !== null && isDetailPath(ctx.pathname, 'friends', true) === true;
  const isOnCollective = isDetailPath(ctx.pathname, 'collectives');
  if (isOnFriend === false && isOnCollective === false) {
    return true;
  }

  e.preventDefault();
  const eventMap = isOnCollective === true ? COLLECTIVE_DETAIL_EVENTS : FRIEND_DETAIL_EVENTS;
  const eventName = eventMap[e.key];
  if (eventName !== undefined) {
    window.dispatchEvent(new CustomEvent(eventName));
  }
  return true;
}
