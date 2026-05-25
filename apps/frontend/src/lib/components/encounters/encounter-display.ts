import { getCurrentLanguage } from '$lib/i18n/index.js';
import type { EncounterType } from '$shared';

/** Minimal shape needed to render an encounter's title/type, shared by card/detail/badge. */
export interface DisplayableEncounter {
  title: string | null;
  encounterType: EncounterType;
  friends: { displayName: string }[];
  /** Total friend count when `friends` is only a preview slice */
  friendCount?: number;
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** Localized name of an interaction type, e.g. "Phone call". */
export function encounterTypeLabel(t: Translate, type: EncounterType): string {
  return t(`encounters.types.${type}`);
}

/**
 * Locale-aware list of friend names. Uses Intl.ListFormat so separators follow
 * the active language; when the list is a preview, the remaining count is rendered
 * via the localized `encounters.friendCountMore` string instead of a hard-coded "+N".
 */
function friendNames(
  t: Translate,
  friends: { displayName: string }[],
  friendCount?: number,
): string {
  const names = friends.map((f) => f.displayName);
  if (names.length === 0) return '';

  const locale = getCurrentLanguage();
  const total = friendCount ?? names.length;
  const extra = total - names.length;

  if (extra > 0) {
    const shown = new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(names);
    return `${shown} ${t('encounters.friendCountMore', { count: extra })}`;
  }
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
}

/**
 * The title to show for an encounter. Uses the user-provided title when present,
 * otherwise derives a label from the interaction type and friends
 * (e.g. "Phone call with Sarah") so calls/messages don't need a title.
 */
export function encounterDisplayTitle(t: Translate, e: DisplayableEncounter): string {
  if (e.title && e.title.trim().length > 0) return e.title;
  const names = friendNames(t, e.friends, e.friendCount);
  // Without any friend names, fall back to the plain type label to avoid a
  // dangling "Phone call with " (e.g. badge with no friendName prop).
  if (!names) return encounterTypeLabel(t, e.encounterType);
  return t(`encounters.derivedTitle.${e.encounterType}`, { names });
}
