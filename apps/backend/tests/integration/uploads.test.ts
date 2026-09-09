import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { authHeaders, createTestFriend, setupFriendsTestSuite } from './friends.helpers.js';

/**
 * Photo serving contract: the friend list renders one thumbnail per row, so the
 * route must let the browser revalidate instead of re-downloading. Covers the
 * ETag round-trip and the owner check.
 */
describe('GET /api/uploads/friends/:friendId/:filename', () => {
  const { getContext } = setupFriendsTestSuite();

  const PHOTO_BYTES = Buffer.from('fake-jpeg-bytes-for-etag-test');
  let uploadDir: string;

  beforeAll(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'fb-uploads-'));
    vi.stubEnv('UPLOAD_DIR', uploadDir);
  });

  async function writePhoto(friendId: string): Promise<void> {
    await mkdir(path.join(uploadDir, friendId), { recursive: true });
    await writeFile(path.join(uploadDir, friendId, 'photo.jpg'), PHOTO_BYTES);
  }

  it('serves the photo with an ETag and answers a matching If-None-Match with 304', async () => {
    const { app, pool, testUser } = getContext();
    const friendId = await createTestFriend(pool, testUser.externalId, 'Photo Friend');
    await writePhoto(friendId);

    const url = `http://localhost/api/uploads/friends/${friendId}/photo.jpg`;

    const first = await app.fetch(
      new Request(url, { headers: authHeaders(testUser.sessionCookies) }),
    );
    expect(first.status).toBe(200);
    expect(first.headers.get('Content-Type')).toBe('image/jpeg');
    expect(first.headers.get('Cache-Control')).toBe('private, max-age=86400');
    expect(first.headers.get('Content-Length')).toBe(String(PHOTO_BYTES.length));
    const etag = first.headers.get('ETag');
    expect(etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
    expect(Buffer.from(await first.arrayBuffer())).toEqual(PHOTO_BYTES);

    const second = await app.fetch(
      new Request(url, {
        headers: { ...authHeaders(testUser.sessionCookies), 'If-None-Match': etag as string },
      }),
    );
    expect(second.status).toBe(304);
    expect(second.headers.get('ETag')).toBe(etag);
    expect(await second.text()).toBe('');
  });

  it('honours a weak validator inside an If-None-Match list, and *', async () => {
    const { app, pool, testUser } = getContext();
    const friendId = await createTestFriend(pool, testUser.externalId, 'List Match Friend');
    await writePhoto(friendId);

    const url = `http://localhost/api/uploads/friends/${friendId}/photo.jpg`;
    const first = await app.fetch(
      new Request(url, { headers: authHeaders(testUser.sessionCookies) }),
    );
    const etag = first.headers.get('ETag') as string;

    const list = await app.fetch(
      new Request(url, {
        headers: {
          ...authHeaders(testUser.sessionCookies),
          'If-None-Match': `W/${etag}, "zzz"`,
        },
      }),
    );
    expect(list.status).toBe(304);

    const wildcard = await app.fetch(
      new Request(url, {
        headers: { ...authHeaders(testUser.sessionCookies), 'If-None-Match': '*' },
      }),
    );
    expect(wildcard.status).toBe(304);
  });

  it('returns 404 when the file is missing', async () => {
    const { app, pool, testUser } = getContext();
    const friendId = await createTestFriend(pool, testUser.externalId, 'No Photo');

    const response = await app.fetch(
      new Request(`http://localhost/api/uploads/friends/${friendId}/photo.jpg`, {
        headers: authHeaders(testUser.sessionCookies),
      }),
    );

    expect(response.status).toBe(404);
  });
});
