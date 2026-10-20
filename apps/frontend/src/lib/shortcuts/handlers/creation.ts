import { goto } from '$app/navigation';
import { CREATION_PATHS } from '../config.js';
import type { HandlerContext } from '../types.js';

export function handleCreation(e: KeyboardEvent, ctx: HandlerContext) {
  if (ctx.pendingKey !== 'n') {
    return false;
  }
  ctx.clearPending();
  e.preventDefault();

  // On the circles page `n c` opens the create modal in place.
  if (e.key === 'c' && ctx.pathname === '/circles') {
    window.dispatchEvent(new CustomEvent('shortcut:new-circle'));
    return true;
  }

  const path = e.key === 'c' ? '/circles' : CREATION_PATHS[e.key];
  if (path !== undefined) {
    void goto(path);
  }
  return true;
}
