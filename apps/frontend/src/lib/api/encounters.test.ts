import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import { jsonResponse, restoreFetch, stubFetch } from '$lib/test';
import {
  createEncounter,
  deleteEncounter,
  getEncounter,
  getFriendEncounters,
  getLastEncounter,
  listEncounters,
  updateEncounter,
} from './encounters.js';

describe('encounters API', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(restoreFetch);

  it('listEncounters serializes filter params into a query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ encounters: [], pagination: {} }));

    await listEncounters({ page: 2, pageSize: 25, friendId: 'f-1', type: 'in_person' as never });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.startsWith('/api/encounters?')).toBe(true);
    expect(url).toContain('page=2');
    expect(url).toContain('page_size=25');
    expect(url).toContain('friend_id=f-1');
    expect(url).toContain('type=in_person');
  });

  it('listEncounters omits the query string when no params are given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ encounters: [], pagination: {} }));
    await listEncounters();
    expect(fetchMock).toHaveBeenCalledWith('/api/encounters', expect.objectContaining({}));
  });

  it('getEncounter / createEncounter / updateEncounter / deleteEncounter hit the right endpoints', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'e-1' }));
    await getEncounter('e-1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/encounters/e-1', expect.objectContaining({}));

    await createEncounter({ title: 'Coffee' } as never);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/encounters',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'Coffee' }) }),
    );

    await updateEncounter('e-1', { title: 'Tea' } as never);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/encounters/e-1',
      expect.objectContaining({ method: 'PUT' }),
    );

    await deleteEncounter('e-1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/encounters/e-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('getFriendEncounters drops friendId from the query and uses the nested path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ encounters: [], pagination: {} }));

    await getFriendEncounters('f-1', { page: 1 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.startsWith('/api/friends/f-1/encounters')).toBe(true);
    expect(url).not.toContain('friend_id');
    expect(url).toContain('page=1');
  });

  describe('getLastEncounter', () => {
    it('returns the summary when present', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'e-9', title: 'Lunch' }));
      const result = await getLastEncounter('f-1');
      expect(result).toEqual({ id: 'e-9', title: 'Lunch' });
    });

    it('returns null on a 404 instead of throwing', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, { status: 404 }));
      const result = await getLastEncounter('f-1');
      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 500 }));
      await expect(getLastEncounter('f-1')).rejects.toMatchObject({ statusCode: 500 });
    });
  });
});
