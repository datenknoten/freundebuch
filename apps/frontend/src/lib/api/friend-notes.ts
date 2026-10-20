import {
  type FriendNoteInputSchema,
  FriendNoteResponseSchema,
  MessageResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface FriendNotesApiOptions {
  client: ApiClient;
}

/** An omitted link is sent as absent; an update replaces the whole note, so it clears the link. */
export interface FriendNoteData {
  content: string;
  encounterId?: string | null;
  sourceFriendId?: string | null;
  supersedesNoteId?: string | null;
}

const FriendNoteResponseListSchema = FriendNoteResponseSchema.array();

function mapFriendNoteInput(data: FriendNoteData) {
  return {
    content: data.content,
    encounter_id: data.encounterId,
    source_friend_id: data.sourceFriendId,
    supersedes_note_id: data.supersedesNoteId,
  } satisfies typeof FriendNoteInputSchema.inferIn;
}

export class FriendNotesApi {
  private readonly client: ApiClient;

  public constructor(options: FriendNotesApiOptions) {
    this.client = options.client;
  }

  /** Newest first. */
  public listNotes(friendId: string) {
    return this.client.request(FriendNoteResponseListSchema, `/api/friends/${friendId}/notes`);
  }

  public addNote(friendId: string, data: FriendNoteData) {
    return this.client.request(FriendNoteResponseSchema, `/api/friends/${friendId}/notes`, {
      method: 'POST',
      body: JSON.stringify(mapFriendNoteInput(data)),
    });
  }

  public updateNote(friendId: string, noteId: string, data: FriendNoteData) {
    return this.client.request(
      FriendNoteResponseSchema,
      `/api/friends/${friendId}/notes/${noteId}`,
      {
        method: 'PUT',
        body: JSON.stringify(mapFriendNoteInput(data)),
      },
    );
  }

  public async deleteNote(friendId: string, noteId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }
}
