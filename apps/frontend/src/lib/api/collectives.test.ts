import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$shared', () => ({}));

import { aCollective, aCollectiveMember, jsonResponse, restoreFetch, stubFetch } from '$lib/test';
import {
  addMember,
  createCollective,
  deactivateMember,
  deleteCollective,
  getCollective,
  listCollectives,
  reactivateMember,
  updateCollective,
} from './collectives.js';

describe('collectives API', () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(restoreFetch);

  describe('listCollectives', () => {
    it('requests the collectives endpoint with no query string by default', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ collectives: [], pagination: {} }));

      await listCollectives();

      expect(fetchMock).toHaveBeenCalledWith('/api/collectives', expect.objectContaining({}));
    });

    it('serializes pagination and filter params into a query string', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ collectives: [], pagination: {} }));

      await listCollectives({ page: 2, pageSize: 50, typeId: 'club-1', includeDeleted: true });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=50');
      expect(url).toContain('type_id=club-1');
      expect(url).toContain('include_deleted=true');
    });
  });

  describe('getCollective', () => {
    it('requests a single collective by id and returns the body', async () => {
      const collective = aCollective({ name: 'Chess Club' });
      fetchMock.mockResolvedValue(jsonResponse(collective));

      const result = await getCollective(collective.id);

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/collectives/${collective.id}`,
        expect.objectContaining({}),
      );
      expect(result).toEqual(collective);
    });
  });

  describe('createCollective', () => {
    it('POSTs the input as a JSON body', async () => {
      const created = aCollective();
      fetchMock.mockResolvedValue(jsonResponse(created));

      await createCollective({ name: 'New Club', collective_type_id: created.type.id });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/collectives',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Club', collective_type_id: created.type.id }),
        }),
      );
    });
  });

  describe('updateCollective', () => {
    it('PUTs to the collective id with the update body', async () => {
      const updated = aCollective({ name: 'Renamed' });
      fetchMock.mockResolvedValue(jsonResponse(updated));

      await updateCollective(updated.id, { name: 'Renamed' });

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/collectives/${updated.id}`,
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) }),
      );
    });
  });

  describe('deleteCollective', () => {
    it('issues a DELETE and resolves to void', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true }));

      await expect(deleteCollective('collective-1')).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/collectives/collective-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('membership operations', () => {
    it('addMember POSTs to the members endpoint', async () => {
      const member = aCollectiveMember();
      fetchMock.mockResolvedValue(jsonResponse(member));

      await addMember('collective-1', { friend_id: member.contact.id, role_id: member.role.id });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/collectives/collective-1/members',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('deactivateMember posts an empty body when no reason is given', async () => {
      const member = aCollectiveMember({ isActive: false });
      fetchMock.mockResolvedValue(jsonResponse(member));

      await deactivateMember('collective-1', member.id);

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/collectives/collective-1/members/${member.id}/deactivate`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({}) }),
      );
    });

    it('reactivateMember posts to the reactivate endpoint', async () => {
      const member = aCollectiveMember({ isActive: true });
      fetchMock.mockResolvedValue(jsonResponse(member));

      await reactivateMember('collective-1', member.id);

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/collectives/collective-1/members/${member.id}/reactivate`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
