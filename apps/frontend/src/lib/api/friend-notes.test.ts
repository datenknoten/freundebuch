import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { aFriendNote } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { FriendNotesApi } from './friend-notes.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function sentRequest() {
  const [url, init] = itemAt(fetchMock.mock.calls, 0);
  return { url: String(url), body: init?.body };
}

function sentJson() {
  return JSON.parse(String(sentRequest().body));
}

function createFriendNotesApi() {
  return new FriendNotesApi({ client: createTestApiClient() });
}

describe('FriendNotesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('listNotes', () => {
    it('returns the notes of the response', async () => {
      const note = aFriendNote({ id: 'n-1' });
      fetchMock.mockResolvedValueOnce(jsonResponse([note]));

      await expect(createFriendNotesApi().listNotes('f-1')).resolves.toEqual([note]);
    });

    it('throws ValidationError when a note lacks its content', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'n-1' }]));

      await expect(createFriendNotesApi().listNotes('f-1')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('updateNote', () => {
    it('sends the note and its links as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aFriendNote()));

      await createFriendNotesApi().updateNote('f-1', 'n-1', {
        content: 'Likes tea',
        encounterId: null,
        sourceFriendId: 'f-2',
        supersedesNoteId: null,
      });

      expect(sentJson()).toEqual({
        content: 'Likes tea',
        encounter_id: null,
        source_friend_id: 'f-2',
        supersedes_note_id: null,
      });
    });
  });
});
