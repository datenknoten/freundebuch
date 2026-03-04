import { get } from 'svelte/store';
import { currentFriend } from '$lib/stores/friends';
import { COLLECTIVE_DETAIL_EVENTS, FRIEND_DETAIL_EVENTS } from '../config.js';
import type { HandlerContext } from '../types.js';

export function handleDetailActions(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pendingKey !== 'a') return false;

  ctx.clearPending();

  const isOnFriend = get(currentFriend) && ctx.pathname.match(/^\/friends\/[^/]+$/);
  const isOnCollective =
    ctx.pathname.match(/^\/collectives\/[^/]+$/) && !ctx.pathname.endsWith('/new');

  if (!isOnFriend && !isOnCollective) {
    return true;
  }

  e.preventDefault();

  const eventMap = isOnCollective ? COLLECTIVE_DETAIL_EVENTS : FRIEND_DETAIL_EVENTS;
  const eventName = eventMap[e.key];
  if (eventName) {
    window.dispatchEvent(new CustomEvent(eventName));
  }

  return true;
}
