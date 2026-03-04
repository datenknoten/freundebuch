import {
  FILTER_CATEGORY_KEYS,
  isOpenCollectiveModeActive,
  isOpenEncounterModeActive,
  isOpenFriendLinkModeActive,
  isOpenMemberModeActive,
  isOpenModeActive,
  openCollectiveModePrefix,
  openEncounterModePrefix,
  openFriendLinkModePrefix,
  openMemberModePrefix,
  openModePrefix,
  visibleCollectiveIds,
  visibleEncounterIds,
  visibleFriendDetailLinks,
  visibleFriendIds,
  visibleMemberContactIds,
} from '$lib/stores/ui';
import type { MenuShortcut, OpenModeConfig } from './types.js';

// ---------------------------------------------------------------------------
// Navigation (g + key)
// ---------------------------------------------------------------------------

export const NAVIGATION_SHORTCUTS: MenuShortcut[] = [
  { key: 'h', labelKey: 'shortcuts.nav.home' },
  { key: 'f', labelKey: 'shortcuts.nav.friends' },
  { key: 'p', labelKey: 'shortcuts.nav.profile' },
  { key: 'c', labelKey: 'shortcuts.nav.circles' },
  { key: 'e', labelKey: 'shortcuts.nav.encounters' },
  { key: 'o', labelKey: 'shortcuts.nav.collectives' },
];

// Mapping from nav shortcut key to full "Go to..." i18n key (for help dialog)
export const NAVIGATION_HELP_KEYS: Record<string, string> = {
  h: 'shortcuts.goHome',
  f: 'shortcuts.goFriends',
  p: 'shortcuts.goProfile',
  c: 'shortcuts.goCircles',
  e: 'shortcuts.goEncounters',
  o: 'shortcuts.goCollectives',
};

export const NAVIGATION_PATHS: Record<string, string> = {
  h: '/',
  p: '/profile',
  c: '/circles',
  e: '/encounters',
  o: '/collectives',
  // 'f' is special-cased to restore filter state
};

// ---------------------------------------------------------------------------
// Creation (n + key)
// ---------------------------------------------------------------------------

export const CREATION_SHORTCUTS: MenuShortcut[] = [
  { key: 'f', labelKey: 'shortcuts.newFriend' },
  { key: 'c', labelKey: 'shortcuts.newCircle' },
  { key: 'e', labelKey: 'shortcuts.newEncounter' },
  { key: 'o', labelKey: 'shortcuts.newCollective' },
];

export const CREATION_PATHS: Record<string, string> = {
  f: '/friends/new',
  e: '/encounters/new',
  o: '/collectives/new',
  // 'c' is special-cased
};

// ---------------------------------------------------------------------------
// Detail actions (a + key)
// ---------------------------------------------------------------------------

export const FRIEND_DETAIL_ACTIONS: MenuShortcut[] = [
  { key: 'p', labelKey: 'shortcuts.add.phone' },
  { key: 'e', labelKey: 'shortcuts.add.email' },
  { key: 'a', labelKey: 'shortcuts.add.address' },
  { key: 'u', labelKey: 'shortcuts.add.url' },
  { key: 'd', labelKey: 'shortcuts.add.date' },
  { key: 's', labelKey: 'shortcuts.add.socialProfile' },
  { key: 'r', labelKey: 'shortcuts.add.relationship' },
  { key: 'c', labelKey: 'shortcuts.add.circle' },
  { key: 'w', labelKey: 'shortcuts.add.workExperience' },
];

export const FRIEND_DETAIL_EVENTS: Record<string, string> = {
  p: 'shortcut:add-phone',
  e: 'shortcut:add-email',
  a: 'shortcut:add-address',
  u: 'shortcut:add-url',
  d: 'shortcut:add-date',
  s: 'shortcut:add-social',
  r: 'shortcut:add-relationship',
  c: 'shortcut:add-circle',
  w: 'shortcut:add-professional',
};

export const COLLECTIVE_DETAIL_ACTIONS: MenuShortcut[] = [
  { key: 'p', labelKey: 'shortcuts.add.phone' },
  { key: 'e', labelKey: 'shortcuts.add.email' },
  { key: 'a', labelKey: 'shortcuts.add.address' },
  { key: 'u', labelKey: 'shortcuts.add.url' },
  { key: 'c', labelKey: 'shortcuts.add.circle' },
  { key: 'm', labelKey: 'shortcuts.add.member' },
];

export const COLLECTIVE_DETAIL_EVENTS: Record<string, string> = {
  p: 'shortcut:collective-add-phone',
  e: 'shortcut:collective-add-email',
  a: 'shortcut:collective-add-address',
  u: 'shortcut:collective-add-url',
  c: 'shortcut:collective-add-circle',
  m: 'shortcut:collective-add-member',
};

// ---------------------------------------------------------------------------
// Open mode configs (o + key)
// ---------------------------------------------------------------------------

export const OPEN_MODE_CONFIGS: OpenModeConfig[] = [
  {
    routeMatch: /^\/friends\/[^/]+$/,
    itemIdsStore: {
      subscribe: visibleFriendDetailLinks.subscribe,
    } as unknown as OpenModeConfig['itemIdsStore'],
    prefixStore: openFriendLinkModePrefix,
    activeStore: isOpenFriendLinkModeActive,
    basePath: '',
    modeName: 'link',
    dispatchEvent: 'shortcut:open-friend-link',
  },
  {
    routeMatch: /^\/collectives\/[^/]+$/,
    itemIdsStore: visibleMemberContactIds,
    prefixStore: openMemberModePrefix,
    activeStore: isOpenMemberModeActive,
    basePath: '/friends',
    modeName: 'member',
  },
  {
    routeMatch: '/friends',
    itemIdsStore: visibleFriendIds,
    prefixStore: openModePrefix,
    activeStore: isOpenModeActive,
    basePath: '/friends',
    modeName: 'friend',
  },
  {
    routeMatch: '/encounters',
    itemIdsStore: visibleEncounterIds,
    prefixStore: openEncounterModePrefix,
    activeStore: isOpenEncounterModeActive,
    basePath: '/encounters',
    modeName: 'encounter',
  },
  {
    routeMatch: '/collectives',
    itemIdsStore: visibleCollectiveIds,
    prefixStore: openCollectiveModePrefix,
    activeStore: isOpenCollectiveModeActive,
    basePath: '/collectives',
    modeName: 'collective',
  },
];

// ---------------------------------------------------------------------------
// Filter panel categories (f + key)
// ---------------------------------------------------------------------------

// Mapping from snake_case filter field names to i18n keys
export const FILTER_FIELD_I18N_KEYS: Record<string, string> = {
  country: 'facets.fields.country',
  city: 'facets.fields.city',
  organization: 'facets.fields.organization',
  job_title: 'facets.fields.jobTitle',
  department: 'facets.fields.department',
  relationship_category: 'facets.fields.relationshipCategory',
  circles: 'facets.fields.circles',
};

export const FILTER_PANEL_CATEGORIES: MenuShortcut[] = Object.entries(FILTER_CATEGORY_KEYS).map(
  ([key, field]) => ({
    key,
    labelKey: FILTER_FIELD_I18N_KEYS[field] ?? field,
  }),
);
