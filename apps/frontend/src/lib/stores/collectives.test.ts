import { createRootLogger } from '@datenknoten/kit/logger';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollectiveResponse } from '$shared';
import { ApiClient } from '../api/api-client.js';
import { ApiError } from '../api/api-error.js';
import { CollectiveMembersApi } from '../api/collective-members.js';
import { CollectivesApi } from '../api/collectives.js';
import { aCollective, aCollectiveMember, aCollectiveType } from '../test/fixtures.js';
import { CollectivesStore } from './collectives.js';

const logger = createRootLogger({ LOG_LEVEL: 'silent' });

async function stayUnauthenticated() {
  return false;
}

function setup() {
  const client = new ApiClient({ baseUrl: '', logger, onUnauthorized: stayUnauthenticated });
  const collectivesApi = new CollectivesApi({ client });
  const collectiveMembersApi = new CollectiveMembersApi({ client });
  const store = new CollectivesStore({ collectivesApi, collectiveMembersApi, logger });
  return { collectivesApi, collectiveMembersApi, store };
}

async function setupWithCurrent(collective: CollectiveResponse) {
  const apis = setup();
  vi.spyOn(apis.collectivesApi, 'getCollective').mockResolvedValue(collective);
  await apis.store.loadCollective(collective.id);
  return apis;
}

describe('CollectivesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadCollectives', () => {
    it('lists the collectives by name', async () => {
      const { collectivesApi, store } = setup();
      vi.spyOn(collectivesApi, 'listCollectives').mockResolvedValue({
        data: [
          { ...aCollectiveListFields('b'), name: 'Zebra Club' },
          { ...aCollectiveListFields('a'), name: 'Alpine Club' },
        ],
        pagination: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
      });

      await store.loadCollectives();

      expect(get(store.list).map((item) => item.name)).toEqual(['Alpine Club', 'Zebra Club']);
    });
  });

  describe('preloadTypes', () => {
    it('keeps the failure in error instead of throwing', async () => {
      const { collectivesApi, store } = setup();
      vi.spyOn(collectivesApi, 'listCollectiveTypes').mockRejectedValue(
        new ApiError(500, 'Types unavailable'),
      );

      await expect(store.preloadTypes()).resolves.toBeUndefined();

      expect(get(store).error).toBe('Types unavailable');
      expect(get(store).isLoadingTypes).toBe(false);
    });

    it('does not refetch cached types', async () => {
      const { collectivesApi, store } = setup();
      const listCollectiveTypes = vi
        .spyOn(collectivesApi, 'listCollectiveTypes')
        .mockResolvedValue({ types: [aCollectiveType()] });

      await store.preloadTypes();
      await store.preloadTypes();

      expect(listCollectiveTypes).toHaveBeenCalledTimes(1);
      expect(get(store.types)).toHaveLength(1);
    });
  });

  describe('addMember', () => {
    it('appends the member to the current collective and counts it as active', async () => {
      const { collectiveMembersApi, store } = await setupWithCurrent(
        aCollective({ id: 'c-1', memberCount: 0, activeMemberCount: 0 }),
      );
      vi.spyOn(collectiveMembersApi, 'addMember').mockResolvedValue(aCollectiveMember());

      await store.addMember('c-1', { friendId: 'f-1', roleId: 'r-1' });

      const current = get(store).currentCollective;
      expect(current?.members).toHaveLength(1);
      expect(current?.memberCount).toBe(1);
      expect(current?.activeMemberCount).toBe(1);
    });

    it('leaves another current collective untouched', async () => {
      const { collectiveMembersApi, store } = await setupWithCurrent(aCollective({ id: 'c-1' }));
      vi.spyOn(collectiveMembersApi, 'addMember').mockResolvedValue(aCollectiveMember());

      await store.addMember('c-2', { friendId: 'f-1', roleId: 'r-1' });

      expect(get(store).currentCollective?.members).toHaveLength(0);
    });
  });

  describe('deactivateMember', () => {
    it('decrements the active count when an active member becomes inactive', async () => {
      const member = aCollectiveMember({ id: 'm-1', isActive: true });
      const { collectiveMembersApi, store } = await setupWithCurrent(
        aCollective({ id: 'c-1', members: [member], memberCount: 1, activeMemberCount: 1 }),
      );
      vi.spyOn(collectiveMembersApi, 'deactivateMember').mockResolvedValue({
        ...member,
        isActive: false,
      });

      await store.deactivateMember('c-1', 'm-1');

      expect(get(store).currentCollective?.activeMemberCount).toBe(0);
    });
  });

  describe('reactivateMember', () => {
    it('increments the active count when an inactive member becomes active', async () => {
      const member = aCollectiveMember({ id: 'm-1', isActive: false });
      const { collectiveMembersApi, store } = await setupWithCurrent(
        aCollective({ id: 'c-1', members: [member], memberCount: 1, activeMemberCount: 0 }),
      );
      vi.spyOn(collectiveMembersApi, 'reactivateMember').mockResolvedValue({
        ...member,
        isActive: true,
      });

      await store.reactivateMember('c-1', 'm-1');

      expect(get(store).currentCollective?.activeMemberCount).toBe(1);
    });
  });

  describe('removeMember', () => {
    it('drops the member and its active count', async () => {
      const member = aCollectiveMember({ id: 'm-1', isActive: true });
      const { collectiveMembersApi, store } = await setupWithCurrent(
        aCollective({ id: 'c-1', members: [member], memberCount: 1, activeMemberCount: 1 }),
      );
      vi.spyOn(collectiveMembersApi, 'removeMember').mockResolvedValue(undefined);

      await store.removeMember('c-1', 'm-1');

      const current = get(store).currentCollective;
      expect(current?.members).toHaveLength(0);
      expect(current?.memberCount).toBe(0);
      expect(current?.activeMemberCount).toBe(0);
    });
  });

  describe('deleteCollective', () => {
    it('clears the current collective when it is the deleted one', async () => {
      const { collectivesApi, store } = await setupWithCurrent(aCollective({ id: 'c-1' }));
      vi.spyOn(collectivesApi, 'deleteCollective').mockResolvedValue(undefined);

      await store.deleteCollective('c-1');

      expect(get(store).currentCollective).toBeNull();
    });
  });
});

function aCollectiveListFields(id: string) {
  const collective = aCollective({ id });
  return {
    id: collective.id,
    name: collective.name,
    type: { id: collective.type.id, name: collective.type.name },
    photoUrl: null,
    photoThumbnailUrl: null,
    memberCount: 0,
    activeMemberCount: 0,
    memberPreview: [],
    createdAt: collective.createdAt,
    deletedAt: null,
  };
}
