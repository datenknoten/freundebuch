import { get } from 'svelte/store';
import { page } from '$app/stores';
import { currentFriend } from '$lib/stores/friends';
import {
  isDeleteCircleModeActive,
  isEditCircleModeActive,
  isOpenCollectiveModeActive,
  isOpenEncounterModeActive,
  isOpenFriendLinkModeActive,
  isOpenMemberModeActive,
  isOpenModeActive,
} from '$lib/stores/ui';
import type { HandlerContext } from '../types.js';
import { handleCircleMode } from './circle-mode.js';
import { handleCreation } from './creation.js';
import { handleDetailActions } from './detail-actions.js';
import { handleFilterMode } from './filter-mode.js';
import { handleGuards } from './guards.js';
import { handleNavigation } from './navigation.js';
import { handleOpenMode } from './open-mode.js';
import { handleSingleKey } from './single-key.js';

export interface KeydownHandlerCallbacks {
  getPendingKey: () => string | null;
  setPendingKey: (key: string | null) => void;
  toggleHelp: () => void;
  clearPending: () => void;
  showHelp: boolean;
}

export function createKeydownHandler(callbacks: KeydownHandlerCallbacks) {
  return function handleKeydown(e: KeyboardEvent) {
    // --- Guards ---
    const { suppress } = handleGuards(e, {
      toggleHelp: callbacks.toggleHelp,
      clearPending: callbacks.clearPending,
      showHelp: callbacks.showHelp,
    });
    if (suppress) return;

    const pathname = get(page).url.pathname;
    const pendingKey = callbacks.getPendingKey();

    const ctx: HandlerContext = {
      pendingKey,
      pathname,
      clearPending: callbacks.clearPending,
    };

    // --- Two-key sequences ---
    if (pendingKey === 'g') {
      handleNavigation(e, ctx);
      return;
    }

    if (pendingKey === 'n') {
      handleCreation(e, ctx);
      return;
    }

    if (pendingKey === 'a') {
      handleDetailActions(e, ctx);
      return;
    }

    if (pendingKey === 'o') {
      handleOpenMode(e, ctx);
      return;
    }

    if (pendingKey === 'f') {
      handleFilterMode(e, ctx);
      return;
    }

    if (pendingKey === 'e' || pendingKey === 'd') {
      if (handleCircleMode(e, ctx)) return;
    }

    // --- Start two-key sequences ---
    if (e.key === 'g') {
      e.preventDefault();
      callbacks.setPendingKey('g');
      return;
    }

    if (e.key === 'n') {
      e.preventDefault();
      callbacks.setPendingKey('n');
      return;
    }

    // Start add detail sequence (on friend or collective detail page)
    if (
      e.key === 'a' &&
      ((get(currentFriend) && pathname.match(/^\/friends\/[^/]+$/)) ||
        (pathname.match(/^\/collectives\/[^/]+$/) && !pathname.endsWith('/new')))
    ) {
      e.preventDefault();
      callbacks.setPendingKey('a');
      return;
    }

    // Start open mode sequences
    if (e.key === 'o') {
      if (pathname === '/friends') {
        e.preventDefault();
        callbacks.setPendingKey('o');
        isOpenModeActive.set(true);
        return;
      }
      if (pathname === '/encounters') {
        e.preventDefault();
        callbacks.setPendingKey('o');
        isOpenEncounterModeActive.set(true);
        return;
      }
      if (pathname === '/collectives') {
        e.preventDefault();
        callbacks.setPendingKey('o');
        isOpenCollectiveModeActive.set(true);
        return;
      }
      if (pathname.match(/^\/collectives\/[^/]+$/) && !pathname.endsWith('/new')) {
        e.preventDefault();
        callbacks.setPendingKey('o');
        isOpenMemberModeActive.set(true);
        return;
      }
      if (pathname.match(/^\/friends\/[^/]+$/) && !pathname.endsWith('/new')) {
        e.preventDefault();
        callbacks.setPendingKey('o');
        isOpenFriendLinkModeActive.set(true);
        return;
      }
    }

    // Start filter sequence (only on friends list page)
    if (e.key === 'f' && pathname === '/friends') {
      e.preventDefault();
      callbacks.setPendingKey('f');
      return;
    }

    // Start edit circle sequence (only on circles page)
    if (e.key === 'e' && pathname === '/circles') {
      e.preventDefault();
      callbacks.setPendingKey('e');
      isEditCircleModeActive.set(true);
      return;
    }

    // Start delete circle sequence (only on circles page)
    if (e.key === 'd' && pathname === '/circles') {
      e.preventDefault();
      callbacks.setPendingKey('d');
      isDeleteCircleModeActive.set(true);
      return;
    }

    // --- Single key shortcuts ---
    handleSingleKey(e);
  };
}
