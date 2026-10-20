import { derived, type Readable, writable } from 'svelte/store';
import type { EncounterListItemResponse, EncounterResponse, PaginationInfo } from '$shared';
import type {
  EncounterCreateData,
  EncounterListParams,
  EncountersApi,
  EncounterUpdateData,
} from '../api/encounters.js';
import { storeAction } from './store-action.js';

export interface EncountersStoreOptions {
  encountersApi: EncountersApi;
}

interface EncounterFilters {
  friendId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface EncountersState {
  encounters: EncounterListItemResponse[];
  currentEncounter: EncounterResponse | null;
  pagination: PaginationInfo;
  filters: EncounterFilters;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: EncountersState = {
  encounters: [],
  currentEncounter: null,
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  error: null,
};

const FRIEND_PREVIEW_SIZE = 3;

function newestFirst(a: EncounterListItemResponse, b: EncounterListItemResponse) {
  return new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime();
}

function toListItem(encounter: EncounterResponse) {
  const item: EncounterListItemResponse = {
    id: encounter.id,
    title: encounter.title,
    encounterType: encounter.encounterType,
    encounterDate: encounter.encounterDate,
    locationText: encounter.locationText,
    friendCount: encounter.friends.length,
    friends: encounter.friends.slice(0, FRIEND_PREVIEW_SIZE),
    createdAt: encounter.createdAt,
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

function prependEncounter(state: EncountersState, encounter: EncounterResponse) {
  return {
    encounters: [toListItem(encounter), ...state.encounters],
    pagination: withTotalCount(state.pagination, state.pagination.totalCount + 1),
  };
}

function replaceEncounter(state: EncountersState, updated: EncounterResponse) {
  return {
    currentEncounter: state.currentEncounter?.id === updated.id ? updated : state.currentEncounter,
    encounters: state.encounters.map((item) =>
      item.id === updated.id ? toListItem(updated) : item,
    ),
  };
}

function withoutEncounter(state: EncountersState, encounterId: string) {
  return {
    currentEncounter: state.currentEncounter?.id === encounterId ? null : state.currentEncounter,
    encounters: state.encounters.filter((item) => item.id !== encounterId),
    pagination: withTotalCount(state.pagination, Math.max(0, state.pagination.totalCount - 1)),
  };
}

/** The encounters list and the encounter on screen. */
export class EncountersStore {
  public readonly subscribe: Readable<EncountersState>['subscribe'];
  /** The listed encounters, newest first. */
  public readonly list: Readable<EncounterListItemResponse[]>;
  private readonly state = writable(INITIAL_STATE);
  private readonly encountersApi: EncountersApi;

  public constructor(options: EncountersStoreOptions) {
    this.encountersApi = options.encountersApi;
    this.subscribe = this.state.subscribe;
    this.list = derived(this.state, (state) => [...state.encounters].sort(newestFirst));
  }

  public loadEncounters(params: EncounterListParams = {}) {
    return storeAction(
      this.state.update,
      () => this.encountersApi.listEncounters(params),
      (_state, result) => ({
        encounters: result.data,
        pagination: result.pagination,
        filters: {
          friendId: params.friendId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          search: params.search,
        },
      }),
      'Failed to load encounters',
    );
  }

  public loadEncounter(encounterId: string) {
    return storeAction(
      this.state.update,
      () => this.encountersApi.getEncounter(encounterId),
      (_state, encounter) => ({ currentEncounter: encounter }),
      'Failed to load encounter',
      () => ({ currentEncounter: null }),
    );
  }

  public createEncounter(data: EncounterCreateData) {
    return storeAction(
      this.state.update,
      () => this.encountersApi.createEncounter(data),
      prependEncounter,
      'Failed to create encounter',
    );
  }

  public updateEncounter(encounterId: string, data: EncounterUpdateData) {
    return storeAction(
      this.state.update,
      () => this.encountersApi.updateEncounter(encounterId, data),
      replaceEncounter,
      'Failed to update encounter',
    );
  }

  public deleteEncounter(encounterId: string) {
    return storeAction(
      this.state.update,
      () => this.encountersApi.deleteEncounter(encounterId),
      (state) => withoutEncounter(state, encounterId),
      'Failed to delete encounter',
    );
  }

  public clear() {
    this.state.set(INITIAL_STATE);
  }
}
