/**
 * The "why did this friend match?" badge shown next to search results.
 *
 * `global-search` built it from a nested ternary and `friend-grid` from a
 * switch, both with untranslated lowercase labels ("email", "phone", "notes").
 * The colours are categorical data colours, deliberately outside the brand
 * palette, and the label is a key so the badge speaks the user's language.
 */
import { CHIP_CLASSES } from '$lib/components/ui/chip-classes.js';
import type { GlobalSearchResultResponse } from '$shared';

export type MatchSource = GlobalSearchResultResponse['matchSource'];

export interface MatchSourceBadge {
  /** Complete chip class string, ready for a `<span>`. */
  class: string;
  labelKey: string;
}

/**
 * Badge for a match source, or `undefined` when there is nothing worth showing —
 * `friend` means the name itself matched, which the result row already makes
 * obvious, and no source means the result did not come from a search at all.
 */
export function findMatchSourceBadge(source: MatchSource | undefined) {
  switch (source) {
    case 'email':
      return {
        class: `${CHIP_CLASSES.base} bg-blue-100 text-blue-700`,
        labelKey: 'friendList.matchSource.email',
      } satisfies MatchSourceBadge;
    case 'phone':
      return {
        class: `${CHIP_CLASSES.base} bg-green-100 text-green-700`,
        labelKey: 'friendList.matchSource.phone',
      } satisfies MatchSourceBadge;
    case 'notes':
      return {
        class: `${CHIP_CLASSES.base} bg-purple-100 text-purple-700`,
        labelKey: 'friendList.matchSource.notes',
      } satisfies MatchSourceBadge;
    default:
      return undefined;
  }
}
