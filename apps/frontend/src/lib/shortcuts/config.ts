import type { MenuShortcut, NavigationShortcut, OpenModeConfig } from './types.js';

//#region Navigation (g + key)

export const NAVIGATION_SHORTCUTS: NavigationShortcut[] = [
  { key: 'h', labelKey: 'shortcuts.nav.home', helpKey: 'shortcuts.goHome' },
  { key: 'f', labelKey: 'shortcuts.nav.friends', helpKey: 'shortcuts.goFriends' },
  { key: 'p', labelKey: 'shortcuts.nav.profile', helpKey: 'shortcuts.goProfile' },
  { key: 'c', labelKey: 'shortcuts.nav.circles', helpKey: 'shortcuts.goCircles' },
  { key: 'e', labelKey: 'shortcuts.nav.encounters', helpKey: 'shortcuts.goEncounters' },
  { key: 'o', labelKey: 'shortcuts.nav.collectives', helpKey: 'shortcuts.goCollectives' },
];

export const NAVIGATION_PATHS: Record<string, string> = {
  h: '/',
  p: '/profile',
  c: '/circles',
  e: '/encounters',
  o: '/collectives',
  // 'f' is special-cased to restore filter state
};
//#endregion

//#region Creation (n + key)

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
//#endregion

//#region Detail actions (a + key)

export const FRIEND_DETAIL_ACTIONS: MenuShortcut[] = [
  { key: 'p', labelKey: 'shortcuts.add.phone' },
  { key: 'e', labelKey: 'shortcuts.add.email' },
  { key: 'a', labelKey: 'shortcuts.add.address' },
  { key: 'u', labelKey: 'shortcuts.add.url' },
  { key: 'd', labelKey: 'shortcuts.add.date' },
  { key: 's', labelKey: 'shortcuts.add.socialProfile' },
  { key: 'r', labelKey: 'shortcuts.add.relationship' },
  { key: 'c', labelKey: 'shortcuts.add.circle' },
  { key: 'o', labelKey: 'shortcuts.add.collective' },
  { key: 'w', labelKey: 'shortcuts.add.workExperience' },
  { key: 'n', labelKey: 'shortcuts.add.note' },
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
  o: 'shortcut:add-collective',
  w: 'shortcut:add-professional',
  n: 'shortcut:add-note',
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
//#endregion

//#region Open mode configs (o + key)

export const OPEN_MODE_CONFIGS: OpenModeConfig[] = [
  {
    routeMatch: /^\/friends\/[^/]+$/,
    mode: 'friendLinks',
    basePath: '',
    dispatchEvent: 'shortcut:open-friend-link',
  },
  { routeMatch: /^\/collectives\/[^/]+$/, mode: 'members', basePath: '/friends' },
  { routeMatch: /^\/encounters\/[^/]+$/, mode: 'encounterFriends', basePath: '/friends' },
  { routeMatch: '/friends', mode: 'friends', basePath: '/friends' },
  { routeMatch: '/encounters', mode: 'encounters', basePath: '/encounters' },
  { routeMatch: '/collectives', mode: 'collectives', basePath: '/collectives' },
];
//#endregion

//#region Filter panel categories (f + key)

/** The key that picks each facet field in filter mode (`f c` → country). */
export const FILTER_CATEGORY_KEYS: Record<string, string> = {
  c: 'country',
  i: 'city',
  o: 'organization',
  j: 'job_title',
  d: 'department',
  r: 'relationship_category',
  l: 'circles',
};

export const FILTER_CATEGORY_LABELS: Record<string, { key: string; labelKey: string }> = {
  country: { key: 'c', labelKey: 'facets.categories.country' },
  city: { key: 'i', labelKey: 'facets.categories.city' },
  organization: { key: 'o', labelKey: 'facets.categories.organization' },
  job_title: { key: 'j', labelKey: 'facets.categories.jobTitle' },
  department: { key: 'd', labelKey: 'facets.categories.department' },
  relationship_category: { key: 'r', labelKey: 'facets.categories.relationship' },
  circles: { key: 'l', labelKey: 'facets.categories.circles' },
};

export const FILTER_FIELD_I18N_KEYS: Record<string, string> = {
  country: 'facets.fields.country',
  city: 'facets.fields.city',
  organization: 'facets.fields.organization',
  job_title: 'facets.fields.jobTitle',
  department: 'facets.fields.department',
  relationship_category: 'facets.fields.relationshipCategory',
  circles: 'facets.fields.circles',
};

function toFilterPanelCategory([key, field]: [string, string]) {
  return { key, labelKey: FILTER_FIELD_I18N_KEYS[field] ?? field } satisfies MenuShortcut;
}

export const filterPanelCategories: MenuShortcut[] =
  Object.entries(FILTER_CATEGORY_KEYS).map(toFilterPanelCategory);
//#endregion
