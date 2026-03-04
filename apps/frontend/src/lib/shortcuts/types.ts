import type { Readable, Writable } from 'svelte/store';

export interface HandlerResult {
  handled: boolean;
  clearPending?: boolean;
}

export interface MenuShortcut {
  key: string;
  labelKey: string;
}

export interface OpenModeConfig {
  routeMatch: string | RegExp;
  itemIdsStore: Readable<string[]>;
  prefixStore: Writable<string | null>;
  activeStore: Writable<boolean>;
  basePath: string;
  modeName: string;
  dispatchEvent?: string;
}

export interface PageContext {
  isOnCirclesPage: boolean;
  isOnFriendsListPage: boolean;
  isOnEncountersListPage: boolean;
  isOnCollectivesListPage: boolean;
  isOnFriendDetailPage: boolean;
  isOnCollectiveDetailPage: boolean;
}

export interface HandlerContext {
  pendingKey: string | null;
  pathname: string;
  clearPending: () => void;
}
