import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { friendListFilter } from '$lib/stores/friends';
import { NAVIGATION_PATHS } from '../config.js';
import type { HandlerContext } from '../types.js';

export function handleNavigation(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pendingKey !== 'g') return false;

  ctx.clearPending();
  e.preventDefault();

  if (e.key === 'f') {
    // Restore filter state from store when navigating to friends
    const filterState = get(friendListFilter);
    const params = friendListFilter.buildSearchParams(filterState);
    const queryString = params.toString();
    goto(queryString ? `/friends?${queryString}` : '/friends');
    return true;
  }

  const path = NAVIGATION_PATHS[e.key];
  if (path) {
    goto(path);
  }

  return true;
}
