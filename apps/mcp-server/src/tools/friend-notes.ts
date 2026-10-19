import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Services } from '../utils/service-factory.js';

/**
 * Friend notes (Epic 15). Errors from the service (unknown friend, encounter
 * or note, self-reference, double supersede) propagate: the SDK turns a thrown
 * error into an `isError` tool result with the error message.
 */
export function registerFriendNotesTools(
  server: McpServer,
  services: Services,
  getUserId: () => string,
) {
  server.tool(
    'list_friend_notes',
    'List all notes about a friend, newest first. Each note has its text, creation time, the encounter where it was learned, the friend who told it, and supersede links (supersedesNoteId / supersededByNoteId; a superseded note is outdated).',
    {
      friendId: z.string().uuid().describe('The friend ID (UUID)'),
    },
    async ({ friendId }) => {
      const notes = await services.friendNotes.list(getUserId(), friendId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(notes, null, 2) }] };
    },
  );

  server.tool(
    'create_friend_note',
    'Add a note about a friend: a fact or detail the user learned. Optionally link the encounter where it was learned, the friend who told it, and an older note of the same friend that this note replaces. Returns the created note.',
    {
      friendId: z.string().uuid().describe('The friend ID (UUID) that the note is about'),
      content: z.string().trim().min(1).describe('The note text'),
      encounterId: z
        .string()
        .uuid()
        .nullish()
        .describe('The encounter ID (UUID) where the user learned this'),
      sourceFriendId: z
        .string()
        .uuid()
        .nullish()
        .describe('The friend ID (UUID) of the friend who told the user this'),
      supersedesNoteId: z
        .string()
        .uuid()
        .nullish()
        .describe('The ID (UUID) of an older note of the same friend that this note replaces'),
    },
    async ({ friendId, content, encounterId, sourceFriendId, supersedesNoteId }) => {
      const note = await services.friendNotes.create(getUserId(), friendId, {
        content,
        encounter_id: encounterId ?? null,
        source_friend_id: sourceFriendId ?? null,
        supersedes_note_id: supersedesNoteId ?? null,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(note, null, 2) }] };
    },
  );
}
