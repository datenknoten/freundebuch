import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { buildSearchParams } from '$lib/stores/friend-list-search-params.js';
import { NAVIGATION_PATHS } from '../config.js';
import type { HandlerContext } from '../types.js';

/** `g f` restores the friends list with the filters it had when the user left it. */
function friendsListPath(ctx: HandlerContext) {
  const queryString = buildSearchParams(get(ctx.stores.friendListFilter)).toString();
  return queryString === '' ? '/friends' : `/friends?${queryString}`;
}

export function handleNavigation(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pendingKey !== 'g') {
    return false;
  }
  ctx.clearPending();
  e.preventDefault();

  const path = e.key === 'f' ? friendsListPath(ctx) : NAVIGATION_PATHS[e.key];
  if (path !== undefined) {
    void goto(path);
  }
  return true;
}
