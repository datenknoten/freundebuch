import type { FriendSearchResult } from '../friends/friend-search-result.js';
import type { FriendNoteEncounter } from './friend-note-encounter.js';

export interface FriendNote {
  id: string;
  /** Markdown; an `@`-mention is a link such as `[Anna](/friends/{id})` */
  content: string;
  encounter: FriendNoteEncounter | null;
  /** The friend who told the user about this */
  sourceFriend: FriendSearchResult | null;
  /** The older note of the same friend that this note replaces */
  supersedesNoteId: string | null;
  /** The newer note that replaces this one; a superseded note is outdated */
  supersededByNoteId: string | null;
  createdAt: string;
  updatedAt: string;
}
