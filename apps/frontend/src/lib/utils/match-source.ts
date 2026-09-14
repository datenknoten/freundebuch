/**
 * The "why did this friend match?" badge shown next to search results.
 *
 * `global-search` built it from a nested ternary and `friend-grid` from a
 * switch, both with untranslated lowercase labels ("email", "phone", "notes").
 * The colours are categorical data colours, deliberately outside the brand
 * palette, and the label is a key so the badge speaks the user's language.
 */
import { chipClasses } from '$lib/components/ui/styles';
import type { GlobalSearchResult } from '$shared';

export type MatchSource = GlobalSearchResult['matchSource'];

export interface MatchSourceBadge {
  /** Complete chip class string, ready for a `<span>`. */
  class: string;
  labelKey: string;
}

/**
 * Badge for a match source, or `null` when there is nothing worth showing —
 * `friend` means the name itself matched, which the result row already makes
 * obvious, and `null` means the result did not come from a search at all.
 */
export function matchSourceBadge(source: MatchSource | undefined): MatchSourceBadge | null {
  switch (source) {
    case 'email':
      return {
        class: `${chipClasses.base} bg-blue-100 text-blue-700`,
        labelKey: 'friendList.matchSource.email',
      };
    case 'phone':
      return {
        class: `${chipClasses.base} bg-green-100 text-green-700`,
        labelKey: 'friendList.matchSource.phone',
      };
    case 'notes':
      return {
        class: `${chipClasses.base} bg-purple-100 text-purple-700`,
        labelKey: 'friendList.matchSource.notes',
      };
    default:
      return null;
  }
}
