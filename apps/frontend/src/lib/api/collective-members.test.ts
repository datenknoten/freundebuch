import { ValidationError } from '@datenknoten/kit';
import { createRootLogger } from '@datenknoten/kit/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aCollectiveMember, aCollectiveRole } from '$lib/test/fixtures.js';
import { itemAt } from '$lib/test/item-at.js';
import { ApiClient } from './api-client.js';
import { CollectiveMembersApi } from './collective-members.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function stayUnauthenticated() {
  return false;
}

function createCollectiveMembersApi() {
  const client = new ApiClient({
    baseUrl: '',
    logger: createRootLogger({ LOG_LEVEL: 'silent' }),
    onUnauthorized: stayUnauthenticated,
  });
  return new CollectiveMembersApi({ client });
}

function sentBody() {
  return JSON.parse(String(itemAt(fetchMock.mock.calls, 0)[1]?.body));
}

describe('CollectiveMembersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('addMember', () => {
    it('sends the membership as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aCollectiveMember(), 201));

      await createCollectiveMembersApi().addMember('c-1', {
        friendId: 'f-1',
        roleId: 'r-1',
        shouldSkipAutoRelationships: true,
      });

      expect(sentBody()).toEqual({
        friend_id: 'f-1',
        role_id: 'r-1',
        skip_auto_relationships: true,
      });
    });

    it('returns the member of the response', async () => {
      const member = aCollectiveMember();
      fetchMock.mockResolvedValueOnce(jsonResponse(member, 201));

      await expect(
        createCollectiveMembersApi().addMember('c-1', { friendId: 'f-1', roleId: 'r-1' }),
      ).resolves.toEqual(member);
    });

    it('throws ValidationError when the member lacks its role', async () => {
      const { role: _role, ...incomplete } = aCollectiveMember();
      fetchMock.mockResolvedValueOnce(jsonResponse(incomplete, 201));

      await expect(
        createCollectiveMembersApi().addMember('c-1', { friendId: 'f-1', roleId: 'r-1' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('deactivateMember', () => {
    it('sends the reason and date as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(aCollectiveMember({ isActive: false })));

      await createCollectiveMembersApi().deactivateMember('c-1', 'm-1', {
        reason: 'Moved away',
        inactiveDate: '2026-03-01',
      });

      expect(sentBody()).toEqual({ reason: 'Moved away', inactive_date: '2026-03-01' });
    });
  });

  describe('previewMemberRelationships', () => {
    it('sends the friend and role as the snake_case wire input', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          newContact: { id: 'f-1', displayName: 'Ada', photoUrl: null },
          role: aCollectiveRole(),
          relationships: [],
          existingRelationshipsSkipped: 0,
        }),
      );

      await createCollectiveMembersApi().previewMemberRelationships('c-1', {
        friendId: 'f-1',
        roleId: 'r-1',
      });

      expect(sentBody()).toEqual({ friend_id: 'f-1', role_id: 'r-1' });
    });

    it('throws ValidationError when the preview lacks its relationships', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      await expect(
        createCollectiveMembersApi().previewMemberRelationships('c-1', {
          friendId: 'f-1',
          roleId: 'r-1',
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('removeMember', () => {
    it('throws ValidationError when the confirmation is malformed', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ removed: true }));

      await expect(createCollectiveMembersApi().removeMember('c-1', 'm-1')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
