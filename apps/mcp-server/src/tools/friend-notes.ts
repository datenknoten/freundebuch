import type { McpServer } from '@modelcontextprotocol/server';
import { type } from 'arktype';
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
  server.registerTool(
    'list_friend_notes',
    {
      description:
        'List all notes about a friend, newest first. Each note has its Markdown text, creation time, the encounter where it was learned, the friend who told it, and supersede links (supersedesNoteId / supersededByNoteId; a superseded note is outdated).',
      inputSchema: type({
        friendId: type('string.uuid').describe('The friend ID (UUID)', 'self'),
      }),
    },
    async ({ friendId }) => {
      const notes = await services.friendNotes.list(getUserId(), friendId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(notes, null, 2) }] };
    },
  );

  server.registerTool(
    'create_friend_note',
    {
      description:
        'Add a note about a friend: a fact or detail the user learned. Optionally link the encounter where it was learned, the friend who told it, and an older note of the same friend that this note replaces. Returns the created note.',
      inputSchema: type({
        friendId: type('string.uuid').describe(
          'The friend ID (UUID) that the note is about',
          'self',
        ),
        // Plain describe(): a 'self' description does not survive into the
        // JSON Schema of a morph's input side.
        content: type('string.trim')
          .to('string > 0')
          .describe(
            'The note text as Markdown. Mention a friend, collective or encounter with a link such as [Anna](/friends/{id}), [Club](/collectives/{id}) or [Lunch](/encounters/{id}).',
          ),
        'encounterId?': type('string.uuid | null').describe(
          'The encounter ID (UUID) where the user learned this',
          'self',
        ),
        'sourceFriendId?': type('string.uuid | null').describe(
          'The friend ID (UUID) of the friend who told the user this',
          'self',
        ),
        'supersedesNoteId?': type('string.uuid | null').describe(
          'The ID (UUID) of an older note of the same friend that this note replaces',
          'self',
        ),
      }),
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
