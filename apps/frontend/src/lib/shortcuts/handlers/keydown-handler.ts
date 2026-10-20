import { get } from 'svelte/store';
import { page } from '$app/stores';
import { isDetailPath } from '../detail-path.js';
import { findOpenModeConfig } from '../find-open-mode-config.js';
import type { HandlerContext, ShortcutStores } from '../types.js';
import { handleCircleMode } from './circle-mode.js';
import { handleCreation } from './creation.js';
import { handleDetailActions } from './detail-actions.js';
import { handleFilterMode } from './filter-mode.js';
import { handleGuards } from './guards.js';
import { handleNavigation } from './navigation.js';
import { handleOpenMode } from './open-mode.js';
import { handleSingleKey } from './single-key.js';

export interface KeydownHandlerOptions {
  getPendingKey: () => string | null;
  setPendingKey: (key: string | null) => void;
  toggleHelp: () => void;
  clearPending: () => void;
  isHelpOpen: boolean;
  stores: ShortcutStores;
}

/** Runs the handler of a pending two-key sequence; `true` when it consumed the event. */
function handlePendingSequence(e: KeyboardEvent, ctx: HandlerContext) {
  switch (ctx.pendingKey) {
    case 'g':
      handleNavigation(e, ctx);
      return true;
    case 'n':
      handleCreation(e, ctx);
      return true;
    case 'a':
      handleDetailActions(e, ctx);
      return true;
    case 'o':
      handleOpenMode(e, ctx);
      return true;
    case 'f':
      handleFilterMode(e, ctx);
      return true;
    case 'e':
    case 'd':
      return handleCircleMode(e, ctx);
    default:
      return false;
  }
}

function canStartDetailAction(ctx: HandlerContext) {
  const isOnFriend =
    get(ctx.stores.currentFriend) !== null && isDetailPath(ctx.pathname, 'friends', true) === true;
  return isOnFriend === true || isDetailPath(ctx.pathname, 'collectives') === true;
}

/** Starts a two-key sequence; `true` when the key opened one. */
function startSequence(e: KeyboardEvent, ctx: HandlerContext, options: KeydownHandlerOptions) {
  const { keyboardModes } = ctx.stores;
  const { pathname } = ctx;

  if (e.key === 'g' || e.key === 'n' || (e.key === 'a' && canStartDetailAction(ctx) === true)) {
    e.preventDefault();
    options.setPendingKey(e.key);
    return true;
  }

  const openModeConfig = e.key === 'o' ? findOpenModeConfig(pathname) : undefined;
  if (openModeConfig !== undefined) {
    e.preventDefault();
    options.setPendingKey('o');
    keyboardModes[openModeConfig.mode].isActive.set(true);
    return true;
  }

  if (e.key === 'f' && pathname === '/friends') {
    e.preventDefault();
    options.setPendingKey('f');
    return true;
  }

  if ((e.key === 'e' || e.key === 'd') && pathname === '/circles') {
    e.preventDefault();
    options.setPendingKey(e.key);
    const circleMode = e.key === 'e' ? keyboardModes.editCircle : keyboardModes.deleteCircle;
    circleMode.isActive.set(true);
    return true;
  }

  return false;
}

export function createKeydownHandler(options: KeydownHandlerOptions) {
  return function handleKeydown(e: KeyboardEvent) {
    const { suppress } = handleGuards(e, options);
    if (suppress === true) {
      return;
    }

    const ctx: HandlerContext = {
      pendingKey: options.getPendingKey(),
      pathname: get(page).url.pathname,
      clearPending: options.clearPending,
      stores: options.stores,
    };

    if (handlePendingSequence(e, ctx) === true || startSequence(e, ctx, options) === true) {
      return;
    }
    handleSingleKey(e, ctx);
  };
}
