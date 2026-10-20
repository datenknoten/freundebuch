import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { isDetailPath } from '../detail-path.js';
import type { HandlerContext } from '../types.js';

function handleEditKey(e: KeyboardEvent, ctx: HandlerContext) {
  const currentFriend = get(ctx.stores.currentFriend);
  if (currentFriend !== null && isDetailPath(ctx.pathname, 'friends', true) === true) {
    e.preventDefault();
    void goto(`/friends/${currentFriend.id}/edit`);
    return true;
  }
  if (isDetailPath(ctx.pathname, 'collectives', true) === true) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('shortcut:edit-collective'));
    return true;
  }
  if (isDetailPath(ctx.pathname, 'encounters') === true) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('shortcut:edit-encounter'));
    return true;
  }
  return false;
}

function focusSearch(e: KeyboardEvent) {
  e.preventDefault();
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  if (searchInput === null) {
    void goto('/friends');
    return true;
  }
  searchInput.focus();
  return true;
}

function dispatchPageChange(e: KeyboardEvent, ctx: HandlerContext, eventName: string) {
  if (ctx.pathname !== '/friends') {
    return false;
  }
  e.preventDefault();
  window.dispatchEvent(new CustomEvent(eventName));
  return true;
}

export function handleSingleKey(e: KeyboardEvent, ctx: HandlerContext) {
  switch (e.key) {
    case 'e':
      return handleEditKey(e, ctx);
    case '/':
      return focusSearch(e);
    case '<':
      return dispatchPageChange(e, ctx, 'shortcut:previous-page');
    case '>':
      return dispatchPageChange(e, ctx, 'shortcut:next-page');
    default:
      return false;
  }
}
