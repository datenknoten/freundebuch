import { type FriendNoteInput, FriendNoteInputSchema } from '@freundebuch/shared/index.js';
import { Hono } from 'hono';
import { getAuthUser } from '../../../middleware/auth.js';
import type {
  FriendNoteData,
  FriendNotesService,
} from '../../../services/friends/sub-resources/friend-notes.service.js';
import type { AppContext } from '../../../types/context.js';
import { parseBody } from '../../../utils/parse-body.js';
import { requireUuidParam } from '../../../utils/require-uuid-param.js';

export interface NotesRoutesOptions {
  friendNotesService: FriendNotesService;
}

function mapFriendNoteInput(input: FriendNoteInput) {
  return {
    content: input.content,
    encounterId: input.encounter_id,
    sourceFriendId: input.source_friend_id,
    supersedesNoteId: input.supersedes_note_id,
  } satisfies FriendNoteData;
}

/**
 * Hand-written rather than generated: a note links to an encounter, a source
 * friend and an older note, and each write must report exactly which link
 * failed (404 for an unknown reference, 400 for a self-reference or a newer
 * supersede target, 409 when the superseded note already has a newer version).
 * The service throws those typed errors; the global handler renders them.
 */
export function createNotesRoutes(options: NotesRoutesOptions) {
  const app = new Hono<AppContext>();

  // Newest first. Not paginated: the number of notes per friend stays small
  // and the section loads an array.
  app.get('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');

    const notes = await options.friendNotesService.list(user.userId, friendId);

    return c.json(notes);
  });

  app.post('/', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const data = mapFriendNoteInput(await parseBody(c, FriendNoteInputSchema));

    const note = await options.friendNotesService.create(user.userId, friendId, data);

    return c.json(note, 201);
  });

  // Replaces the note; an omitted link field clears the link
  app.put('/:noteId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const noteId = requireUuidParam(c, 'noteId', 'note ID');
    const data = mapFriendNoteInput(await parseBody(c, FriendNoteInputSchema));

    const note = await options.friendNotesService.update(user.userId, friendId, noteId, data);

    return c.json(note);
  });

  app.delete('/:noteId', async (c) => {
    const user = getAuthUser(c);
    const friendId = requireUuidParam(c, 'id', 'friend ID');
    const noteId = requireUuidParam(c, 'noteId', 'note ID');

    await options.friendNotesService.delete(user.userId, friendId, noteId);

    return c.json({ message: 'Note deleted successfully' });
  });

  return app;
}
