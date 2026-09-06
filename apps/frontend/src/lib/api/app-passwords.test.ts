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
    const rows = [{ externalId: 'ap-1', name: 'CalDAV', lastUsedAt: null, createdAt: 't' }];
    fetchMock.mockResolvedValue(jsonResponse(rows));

    const result = await listAppPasswords();

    expect(fetchMock).toHaveBeenCalledWith('/api/app-passwords', expect.objectContaining({}));
    expect(result).toEqual(rows);
  });

  it('createAppPassword POSTs the name and returns the one-time password', async () => {
    const created = {
      externalId: 'ap-2',
      name: 'Phone',
      passwordPrefix: 'abcd1234',
      lastUsedAt: null,
      createdAt: 't',
      password: 'abcd-1234-efgh-5678',
    };
    fetchMock.mockResolvedValue(jsonResponse(created));

    const result = await createAppPassword('Phone');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-passwords',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Phone' }) }),
    );
    expect(result.password).toBe('abcd-1234-efgh-5678');
    expect(result.passwordPrefix).toBe('abcd1234');
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
