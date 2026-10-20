import { type Traversal, type } from 'arktype';

function checkContent(content: string, ctx: Traversal): boolean {
  if (content.trim().length > 0) {
    return true;
  }
  return ctx.mustBe('non-empty note content');
}

/**
 * Friend notes (Epic 15): timestamped free-text notes about a friend.
 *
 * POST and PUT share this schema. PUT replaces the whole note, so an omitted
 * link field means `null`.
 */
export const FriendNoteInputSchema = type({
  content: type('string').narrow(checkContent),
  'encounter_id?': 'string.uuid | null',
  'source_friend_id?': 'string.uuid | null',
  'supersedes_note_id?': 'string.uuid | null',
});

export type FriendNoteInput = typeof FriendNoteInputSchema.infer;
