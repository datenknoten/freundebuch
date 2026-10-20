import type { Readable } from 'svelte/store';
import type { FriendListFilterState } from '$lib/stores/friend-list-filter.js';
import type { KeyboardModesStore } from '$lib/stores/keyboard-modes.js';
import type { OverlayStore } from '$lib/stores/overlay.js';

export interface MenuShortcut {
  key: string;
  labelKey: string;
}

export interface NavigationShortcut extends MenuShortcut {
  helpKey: string;
}

export type OpenModeItem = string | { url: string };

export type OpenModeKey =
  | 'friends'
  | 'friendLinks'
  | 'collectives'
  | 'members'
  | 'encounters'
  | 'encounterFriends';

export interface OpenModeConfig {
  routeMatch: string | RegExp;
  mode: OpenModeKey;
  basePath: string;
  /** Dispatched with `{ index }` instead of navigating to `basePath`. */
  dispatchEvent?: string;
}

export interface PageContext {
  isOnCirclesPage: boolean;
  isOnFriendsListPage: boolean;
  isOnEncountersListPage: boolean;
  isOnCollectivesListPage: boolean;
  isOnFriendDetailPage: boolean;
  isOnCollectiveDetailPage: boolean;
  isOnEncounterDetailPage: boolean;
}

/** The app state the shortcut handlers read and drive; `KeyboardShortcuts` takes it from the AppContext. */
export interface ShortcutStores {
  keyboardModes: KeyboardModesStore;
  overlay: OverlayStore;
  isAuthenticated: Readable<boolean>;
  search: { isOpen: Readable<boolean>; toggle(): void };
  currentFriend: Readable<{ id: string } | null>;
  friendListFilter: Readable<FriendListFilterState>;
}

export interface HandlerContext {
  pendingKey: string | null;
  pathname: string;
  clearPending: () => void;
  stores: ShortcutStores;
}
