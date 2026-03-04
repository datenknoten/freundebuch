import type { Readable, Writable } from 'svelte/store';

export interface MenuShortcut {
  key: string;
  labelKey: string;
}

export interface NavigationShortcut extends MenuShortcut {
  helpKey: string;
}

export type OpenModeItem = string | { url: string };

export interface OpenModeConfig {
  routeMatch: string | RegExp;
  itemIdsStore: Readable<OpenModeItem[]>;
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
