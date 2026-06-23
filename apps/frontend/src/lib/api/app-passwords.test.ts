import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { jsonResponse, restoreFetch, stubFetch } from '$lib/test';
import { createAppPassword, listAppPasswords, revokeAppPassword } from './app-passwords.js';

describe('app-passwords API', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(restoreFetch);

  it('listAppPasswords GETs the collection and returns it', async () => {
    const rows = [{ externalId: 'ap-1', name: 'CalDAV', passwordPrefix: 'fb_', createdAt: 't' }];
    fetchMock.mockResolvedValue(jsonResponse(rows));

    const result = await listAppPasswords();

    expect(fetchMock).toHaveBeenCalledWith('/api/app-passwords', expect.objectContaining({}));
    expect(result).toEqual(rows);
  });

  it('createAppPassword POSTs the name and returns the one-time password', async () => {
    const created = {
      appPassword: { externalId: 'ap-2', name: 'Phone', passwordPrefix: 'fb_', createdAt: 't' },
      password: 'secret-once',
    };
    fetchMock.mockResolvedValue(jsonResponse(created));

    const result = await createAppPassword('Phone');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-passwords',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Phone' }) }),
    );
    expect(result.password).toBe('secret-once');
  });

  it('revokeAppPassword DELETEs the given id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'revoked' }));

    await revokeAppPassword('ap-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-passwords/ap-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
