import { ValidationError } from '@datenknoten/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApiClient } from '$lib/test/api-test-client.js';
import { itemAt } from '$lib/test/item-at.js';
import { FriendPhotosApi } from './friend-photos.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function sentRequest() {
  const [url, init] = itemAt(fetchMock.mock.calls, 0);
  return { url: String(url), body: init?.body };
}

function createFriendPhotosApi() {
  return new FriendPhotosApi({ client: createTestApiClient() });
}

describe('FriendPhotosApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('uploadPhoto', () => {
    it('sends the file as multipart form data and returns the photo URLs', async () => {
      const urls = { photoUrl: '/photos/f-1.jpg', photoThumbnailUrl: '/photos/f-1-thumb.jpg' };
      fetchMock.mockResolvedValueOnce(jsonResponse(urls, 201));
      const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });

      await expect(createFriendPhotosApi().uploadPhoto('f-1', file)).resolves.toEqual(urls);
      const body = sentRequest().body;
      expect(body).toBeInstanceOf(FormData);
    });

    it('throws ValidationError when the thumbnail URL is missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ photoUrl: '/photos/f-1.jpg' }, 201));
      const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });

      await expect(createFriendPhotosApi().uploadPhoto('f-1', file)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('deletePhoto', () => {
    it('resolves once the backend confirms the deletion', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Photo deleted successfully' }));

      await expect(createFriendPhotosApi().deletePhoto('f-1')).resolves.toBeUndefined();
    });
  });
});
