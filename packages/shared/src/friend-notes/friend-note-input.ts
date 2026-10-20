import { type } from 'arktype';

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
