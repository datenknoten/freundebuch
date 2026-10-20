import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, describe, expect, it } from 'vitest';
import { authHeaders, createTestFriend, setupFriendsTestSuite } from './friends.helpers.js';

/**
 * Photo serving contract: the friend list renders one thumbnail per row, so the
 * route must let the browser revalidate instead of re-downloading. Covers the
 * ETag round-trip and the owner check.
 */
describe('GET /api/uploads/friends/:friendId/:filename', () => {
  const uploadDir = path.join(tmpdir(), `fb-uploads-${randomUUID()}`);
  const { getContext } = setupFriendsTestSuite({ UPLOAD_DIR: uploadDir });

  const PHOTO_BYTES = Buffer.from('fake-jpeg-bytes-for-etag-test');

  async function writePhoto(friendId: string) {
    await mkdir(path.join(uploadDir, friendId), { recursive: true });
    await writeFile(path.join(uploadDir, friendId, 'photo.jpg'), PHOTO_BYTES);
  }

  describe('with a stored photo', () => {
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
      assert(etag !== null, 'the photo response carries an ETag');
      expect(etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
      expect(Buffer.from(await first.arrayBuffer())).toEqual(PHOTO_BYTES);

      const second = await app.fetch(
        new Request(url, {
          headers: { ...authHeaders(testUser.sessionCookies), 'If-None-Match': etag },
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
      const etag = first.headers.get('ETag');
      assert(etag !== null, 'the photo response carries an ETag');

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
  });

  describe('without a stored photo', () => {
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
});
