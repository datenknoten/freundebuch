import type { Logger } from 'pino';
import { derived, get, type Readable, writable } from 'svelte/store';
import type {
  CollectiveListItemResponse,
  CollectiveMemberResponse,
  CollectiveResponse,
  CollectiveTypeResponse,
  PaginationInfo,
} from '$shared';
import { ApiError } from '../api/api-error.js';
import type {
  CollectiveMembersApi,
  MembershipCreateData,
  MembershipDeactivateData,
  MembershipUpdateData,
} from '../api/collective-members.js';
import type {
  CollectiveCreateData,
  CollectiveListParams,
  CollectivesApi,
  CollectiveUpdateData,
} from '../api/collectives.js';
import { storeAction } from './store-action.js';

export interface CollectivesStoreOptions {
  collectivesApi: CollectivesApi;
  collectiveMembersApi: CollectiveMembersApi;
  logger: Logger;
}

interface CollectiveFilters {
  typeId?: string;
  search?: string;
  shouldIncludeDeleted?: boolean;
}

export interface CollectivesState {
  collectives: CollectiveListItemResponse[];
  currentCollective: CollectiveResponse | null;
  collectiveTypes: CollectiveTypeResponse[];
  pagination: PaginationInfo;
  filters: CollectiveFilters;
  isLoading: boolean;
  isLoadingTypes: boolean;
  error: string | null;
}

const INITIAL_STATE: CollectivesState = {
  collectives: [],
  currentCollective: null,
  collectiveTypes: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  isLoadingTypes: false,
  error: null,
};

const MEMBER_PREVIEW_SIZE = 3;

function byName(a: CollectiveListItemResponse, b: CollectiveListItemResponse) {
  return a.name.localeCompare(b.name);
}

function toListItem(collective: CollectiveResponse) {
  const item: CollectiveListItemResponse = {
    id: collective.id,
    name: collective.name,
    type: { id: collective.type.id, name: collective.type.name },
    photoUrl: collective.photoUrl,
    photoThumbnailUrl: collective.photoThumbnailUrl,
    memberCount: collective.memberCount,
    activeMemberCount: collective.activeMemberCount,
    memberPreview: collective.members.slice(0, MEMBER_PREVIEW_SIZE).map((m) => m.contact),
    createdAt: collective.createdAt,
    deletedAt: collective.deletedAt,
  };
  return item;
}

function withTotalCount(pagination: PaginationInfo, totalCount: number) {
  return {
    ...pagination,
    totalCount,
    totalPages: Math.ceil(totalCount / pagination.pageSize),
  };
}

function prependCollective(state: CollectivesState, collective: CollectiveResponse) {
  return {
    collectives: [toListItem(collective), ...state.collectives],
    pagination: withTotalCount(state.pagination, state.pagination.totalCount + 1),
  };
}

function replaceCollective(state: CollectivesState, updated: CollectiveResponse) {
  return {
    currentCollective:
      state.currentCollective?.id === updated.id ? updated : state.currentCollective,
    collectives: state.collectives.map((item) =>
      item.id === updated.id
        ? {
            ...item,
            name: updated.name,
            photoUrl: updated.photoUrl,
            photoThumbnailUrl: updated.photoThumbnailUrl,
          }
        : item,
    ),
  };
}

function withoutCollective(state: CollectivesState, collectiveId: string) {
  return {
    currentCollective:
      state.currentCollective?.id === collectiveId ? null : state.currentCollective,
    collectives: state.collectives.filter((item) => item.id !== collectiveId),
    pagination: withTotalCount(state.pagination, Math.max(0, state.pagination.totalCount - 1)),
  };
}

function appendMember(
  state: CollectivesState,
  collectiveId: string,
  member: CollectiveMemberResponse,
) {
  const current = state.currentCollective;
  if (current === null || current.id !== collectiveId) {
    return {};
  }
  return {
    currentCollective: {
      ...current,
      members: [...current.members, member],
      memberCount: current.memberCount + 1,
      activeMemberCount: current.activeMemberCount + 1,
    },
  };
}

function withoutMember(state: CollectivesState, collectiveId: string, memberId: string) {
  const current = state.currentCollective;
  if (current === null || current.id !== collectiveId) {
    return {};
  }
  const removed = current.members.find((m) => m.id === memberId);
  return {
    currentCollective: {
      ...current,
      members: current.members.filter((m) => m.id !== memberId),
      memberCount: current.memberCount - 1,
      activeMemberCount:
        removed?.isActive === true ? current.activeMemberCount - 1 : current.activeMemberCount,
    },
  };
}

/** Replaces the member and moves `activeMemberCount` by the change of its `isActive` flag. */
function replaceMember(
  state: CollectivesState,
  collectiveId: string,
  member: CollectiveMemberResponse,
) {
  const current = state.currentCollective;
  if (current === null || current.id !== collectiveId) {
    return {};
  }
  const previous = current.members.find((m) => m.id === member.id);
  const activeDelta =
    previous === undefined ? 0 : Number(member.isActive) - Number(previous.isActive);
  return {
    currentCollective: {
      ...current,
      members: current.members.map((m) => (m.id === member.id ? member : m)),
      activeMemberCount: current.activeMemberCount + activeDelta,
    },
  };
}

/** The collectives list, the collective on screen and the collective types. */
export class CollectivesStore {
  public readonly subscribe: Readable<CollectivesState>['subscribe'];
  /** The listed collectives ordered by name. */
  public readonly list: Readable<CollectiveListItemResponse[]>;
  public readonly types: Readable<CollectiveTypeResponse[]>;
  private readonly state = writable(INITIAL_STATE);
  private readonly collectivesApi: CollectivesApi;
  private readonly collectiveMembersApi: CollectiveMembersApi;
  private readonly logger: Logger;

  public constructor(options: CollectivesStoreOptions) {
    this.collectivesApi = options.collectivesApi;
    this.collectiveMembersApi = options.collectiveMembersApi;
    this.logger = options.logger;
    this.subscribe = this.state.subscribe;
    this.list = derived(this.state, (state) => [...state.collectives].sort(byName));
    this.types = derived(this.state, (state) => state.collectiveTypes);
  }

  /** Tracks its progress in `isLoadingTypes` instead of `isLoading`. */
  public async loadTypes() {
    this.state.update((state) => ({ ...state, isLoadingTypes: true, error: null }));
    try {
      const { types } = await this.collectivesApi.listCollectiveTypes();
      this.state.update((state) => ({
        ...state,
        collectiveTypes: types,
        isLoadingTypes: false,
        error: null,
      }));
      return types;
    } catch (err) {
      const error = err instanceof ApiError ? err.message : 'Failed to load collective types';
      this.state.update((state) => ({ ...state, isLoadingTypes: false, error }));
      throw err;
    }
  }

  /** Loads the types unless they are cached; a failure is logged and kept in `error`, never thrown. */
  public async preloadTypes() {
    if (get(this.state).collectiveTypes.length > 0) {
      return;
    }
    try {
      await this.loadTypes();
    } catch (err) {
      this.logger.warn({ err }, 'Failed to preload collective types');
    }
  }

  public loadCollectives(params: CollectiveListParams = {}) {
    return storeAction(
      this.state.update,
      () => this.collectivesApi.listCollectives(params),
      (_state, result) => ({
        collectives: result.data,
        pagination: result.pagination,
        filters: {
          typeId: params.typeId,
          search: params.search,
          shouldIncludeDeleted: params.shouldIncludeDeleted,
        },
      }),
      'Failed to load collectives',
    );
  }

  public loadCollective(collectiveId: string) {
    return storeAction(
      this.state.update,
      () => this.collectivesApi.getCollective(collectiveId),
      (_state, collective) => ({ currentCollective: collective }),
      'Failed to load collective',
      () => ({ currentCollective: null }),
    );
  }

  public createCollective(data: CollectiveCreateData) {
    return storeAction(
      this.state.update,
      () => this.collectivesApi.createCollective(data),
      prependCollective,
      'Failed to create collective',
    );
  }

  public updateCollective(collectiveId: string, data: CollectiveUpdateData) {
    return storeAction(
      this.state.update,
      () => this.collectivesApi.updateCollective(collectiveId, data),
      replaceCollective,
      'Failed to update collective',
    );
  }

  public deleteCollective(collectiveId: string) {
    return storeAction(
      this.state.update,
      () => this.collectivesApi.deleteCollective(collectiveId),
      (state) => withoutCollective(state, collectiveId),
      'Failed to delete collective',
    );
  }

  public addMember(collectiveId: string, data: MembershipCreateData) {
    return storeAction(
      this.state.update,
      () => this.collectiveMembersApi.addMember(collectiveId, data),
      (state, member) => appendMember(state, collectiveId, member),
      'Failed to add member',
    );
  }

  public removeMember(collectiveId: string, memberId: string) {
    return storeAction(
      this.state.update,
      () => this.collectiveMembersApi.removeMember(collectiveId, memberId),
      (state) => withoutMember(state, collectiveId, memberId),
      'Failed to remove member',
    );
  }

  public updateMemberRole(collectiveId: string, memberId: string, data: MembershipUpdateData) {
    return storeAction(
      this.state.update,
      () => this.collectiveMembersApi.updateMemberRole(collectiveId, memberId, data),
      (state, member) => replaceMember(state, collectiveId, member),
      'Failed to update member role',
    );
  }

  public deactivateMember(
    collectiveId: string,
    memberId: string,
    data: MembershipDeactivateData = {},
  ) {
    return storeAction(
      this.state.update,
      () => this.collectiveMembersApi.deactivateMember(collectiveId, memberId, data),
      (state, member) => replaceMember(state, collectiveId, member),
      'Failed to deactivate member',
    );
  }

  public reactivateMember(collectiveId: string, memberId: string) {
    return storeAction(
      this.state.update,
      () => this.collectiveMembersApi.reactivateMember(collectiveId, memberId),
      (state, member) => replaceMember(state, collectiveId, member),
      'Failed to reactivate member',
    );
  }

  public clear() {
    this.state.set(INITIAL_STATE);
  }
}
