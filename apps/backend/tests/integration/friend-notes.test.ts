import type { FriendNoteResponse } from '@freundebuch/shared/index.js';
import { describe, expect, it } from 'vitest';
import {
  authHeaders,
  createAuthenticatedUser,
  createTestFriend,
  setupFriendsTestSuite,
} from './friends.helpers.js';

/**
 * Friend notes (Epic 15): /api/friends/:id/notes. Covers the three links
 * (encounter, source friend, supersede), the tenancy and reference checks
 * that the service enforces, and the ON DELETE SET NULL behaviour of the links.
 */
describe('Friend Notes API - Integration', () => {
  const { getContext } = setupFriendsTestSuite();

  async function req(
    method: string,
    path: string,
    body?: unknown,
    sessionCookies = getContext().testUser.sessionCookies,
  ): Promise<Response> {
    const init: RequestInit = { method, headers: authHeaders(sessionCookies) };
    if (body !== undefined) init.body = JSON.stringify(body);
    return getContext().app.fetch(new Request(`http://localhost${path}`, init));
  }

  async function createNote(
    friendId: string,
    body: Record<string, unknown>,
  ): Promise<FriendNoteResponse> {
    const res = await req('POST', `/api/friends/${friendId}/notes`, body);
    expect(res.status).toBe(201);
    return (await res.json()) as FriendNoteResponse;
  }

  async function listNotes(friendId: string): Promise<FriendNoteResponse[]> {
    const res = await req('GET', `/api/friends/${friendId}/notes`);
    expect(res.status).toBe(200);
    return (await res.json()) as FriendNoteResponse[];
  }

  async function createEncounter(friendId: string): Promise<string> {
    const res = await req('POST', '/api/encounters', {
      title: 'Coffee',
      encounter_date: '2026-06-13',
      encounter_type: 'in_person',
      friend_ids: [friendId],
    });
    expect(res.status).toBe(201);
    const body: unknown = await res.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new Error('Encounter response has no id');
    }
    return body.id;
  }

  async function setup(): Promise<{ friendId: string; sourceId: string }> {
    const { pool, testUser } = getContext();
    const friendId = await createTestFriend(pool, testUser.externalId, 'Bea');
    const sourceId = await createTestFriend(pool, testUser.externalId, 'Anna');
    return { friendId, sourceId };
  }

  it('creates a note with all three links and lists the supersede pair newest first', async () => {
    const { friendId, sourceId } = await setup();
    const encounterId = await createEncounter(sourceId);
    const older = await createNote(friendId, { content: 'Moves to Leipzig' });

    const newer = await createNote(friendId, {
      content: '  Lives in Leipzig now  ',
      encounter_id: encounterId,
      source_friend_id: sourceId,
      supersedes_note_id: older.id,
    });

    expect(newer.content).toBe('Lives in Leipzig now');
    expect(newer.encounter).toMatchObject({
      id: encounterId,
      title: 'Coffee',
      encounterType: 'in_person',
      encounterDate: '2026-06-13',
    });
    expect(newer.sourceFriend).toMatchObject({ id: sourceId, displayName: 'Anna' });
    expect(newer.supersedesNoteId).toBe(older.id);
    expect(newer.supersededByNoteId).toBeNull();

    const notes = await listNotes(friendId);
    expect(notes.map((n) => n.id)).toEqual([newer.id, older.id]);
    expect(notes[1]?.supersededByNoteId).toBe(newer.id);
  });

  it('rejects the friend itself as the source', async () => {
    const { friendId } = await setup();
    const res = await req('POST', `/api/friends/${friendId}/notes`, {
      content: 'x',
      source_friend_id: friendId,
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown encounter', async () => {
    const { friendId } = await setup();
    const res = await req('POST', `/api/friends/${friendId}/notes`, {
      content: 'x',
      encounter_id: '00000000-0000-4000-8000-000000000000',
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: 'Encounter not found: 00000000-0000-4000-8000-000000000000',
      code: 'NOT_FOUND',
    });
  });

  it("returns 404 for another user's friend as the source", async () => {
    const { pool } = getContext();
    const { friendId } = await setup();
    const other = await createAuthenticatedUser(pool, 'other-notes@example.com', 'Password123!');
    const foreignFriendId = await createTestFriend(pool, other.externalId, 'Foreign');

    const res = await req('POST', `/api/friends/${friendId}/notes`, {
      content: 'x',
      source_friend_id: foreignFriendId,
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: `Friend not found: ${foreignFriendId}` });
  });

  it('returns 404 when the superseded note belongs to another friend', async () => {
    const { friendId, sourceId } = await setup();
    const otherFriendsNote = await createNote(sourceId, { content: 'About Anna' });

    const res = await req('POST', `/api/friends/${friendId}/notes`, {
      content: 'x',
      supersedes_note_id: otherFriendsNote.id,
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({
      error: `Superseded note not found: ${otherFriendsNote.id}`,
    });
  });

  it('returns 409 when a note already has a newer version', async () => {
    const { friendId } = await setup();
    const older = await createNote(friendId, { content: 'v1' });
    await createNote(friendId, { content: 'v2', supersedes_note_id: older.id });

    const res = await req('POST', `/api/friends/${friendId}/notes`, {
      content: 'v2 again',
      supersedes_note_id: older.id,
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects an update that makes an older note supersede a newer one', async () => {
    const { friendId } = await setup();
    const older = await createNote(friendId, { content: 'first' });
    const newer = await createNote(friendId, { content: 'second' });

    const res = await req('PUT', `/api/friends/${friendId}/notes/${older.id}`, {
      content: 'first',
      supersedes_note_id: newer.id,
    });
    expect(res.status).toBe(400);
  });

  it('clears links when the newer note or the encounter is deleted', async () => {
    const { friendId, sourceId } = await setup();
    const encounterId = await createEncounter(sourceId);
    const older = await createNote(friendId, { content: 'old', encounter_id: encounterId });
    const newer = await createNote(friendId, { content: 'new', supersedes_note_id: older.id });

    const deleted = await req('DELETE', `/api/friends/${friendId}/notes/${newer.id}`);
    expect(deleted.status).toBe(200);
    let [remaining] = await listNotes(friendId);
    expect(remaining?.id).toBe(older.id);
    expect(remaining?.supersededByNoteId).toBeNull();
    expect(remaining?.encounter?.id).toBe(encounterId);

    expect((await req('DELETE', `/api/encounters/${encounterId}`)).status).toBe(200);
    [remaining] = await listNotes(friendId);
    expect(remaining?.encounter).toBeNull();
  });

  it("returns 404 when listing notes of another user's friend", async () => {
    const { pool } = getContext();
    const other = await createAuthenticatedUser(pool, 'other-notes@example.com', 'Password123!');
    const foreignFriendId = await createTestFriend(pool, other.externalId, 'Foreign');

    const res = await req('GET', `/api/friends/${foreignFriendId}/notes`);
    expect(res.status).toBe(404);
  });

  it('rejects blank content', async () => {
    const { friendId } = await setup();
    const res = await req('POST', `/api/friends/${friendId}/notes`, { content: '   ' });
    expect(res.status).toBe(400);
  });
});
