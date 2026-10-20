import { type } from 'arktype';
import { FriendSearchResultResponseSchema } from '../friends/friend-search-result-response.js';
import { FriendNoteEncounterResponseSchema } from './friend-note-encounter-response.js';

export const FriendNoteResponseSchema = type({
  id: 'string',
  /** Markdown; an `@`-mention is a link such as `[Anna](/friends/{id})` */
  content: 'string',
  encounter: FriendNoteEncounterResponseSchema.or('null'),
  /** The friend who told the user about this */
  sourceFriend: FriendSearchResultResponseSchema.or('null'),
  /** The older note of the same friend that this note replaces */
  supersedesNoteId: 'string | null',
  /** The newer note that replaces this one; a superseded note is outdated */
  supersededByNoteId: 'string | null',
  createdAt: 'string',
  updatedAt: 'string',
});

export type FriendNoteResponse = typeof FriendNoteResponseSchema.infer;
