import { type } from 'arktype';
import type { EncounterType } from './encounters.js';
import type { FriendSearchResult } from './friends.js';

/**
 * Friend notes (Epic 15): timestamped free-text notes about a friend.
 *
 * POST and PUT share this schema. PUT replaces the whole note, so an omitted
 * link field means `null`.
 */
export const FriendNoteInputSchema = type({
  content: 'string',
  'encounter_id?': 'string.uuid | null',
  'source_friend_id?': 'string.uuid | null',
  'supersedes_note_id?': 'string.uuid | null',
}).narrow((data, ctx) => {
  if (data.content.trim().length === 0) {
    ctx.mustBe('a note with non-empty content');
    return false;
  }
  return true;
});
export type FriendNoteInput = typeof FriendNoteInputSchema.infer;

/** The encounter where the user learned a note */
export interface FriendNoteEncounter {
  id: string;
  title: string | null;
  encounterType: EncounterType;
  /** YYYY-MM-DD */
  encounterDate: string;
}

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
