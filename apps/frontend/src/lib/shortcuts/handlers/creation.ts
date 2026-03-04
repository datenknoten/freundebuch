import { goto } from '$app/navigation';
import { CREATION_PATHS } from '../config.js';
import type { HandlerContext } from '../types.js';

export function handleCreation(e: KeyboardEvent, ctx: HandlerContext): boolean {
  if (ctx.pendingKey !== 'n') return false;

  ctx.clearPending();
  e.preventDefault();

  if (e.key === 'c') {
    // If on circles page, open the modal; otherwise navigate there
    if (ctx.pathname === '/circles') {
      window.dispatchEvent(new CustomEvent('shortcut:new-circle'));
    } else {
      goto('/circles');
    }
    return true;
  }

  const path = CREATION_PATHS[e.key];
  if (path) {
    goto(path);
  }

  return true;
}
