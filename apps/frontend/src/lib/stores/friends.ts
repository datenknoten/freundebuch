import type { Logger } from 'pino';
import { derived, get, type Readable, writable } from 'svelte/store';
import type {
  FriendListItemResponse,
  FriendResponse,
  RelationshipTypesGroupedResponse,
} from '$shared';
import type { AddressData } from '../api/address-data.js';
import { ApiError } from '../api/api-error.js';
import type { CirclesApi } from '../api/circles.js';
import type { EmailData } from '../api/email-data.js';
import type { FriendCreateData } from '../api/friend-create-data.js';
import type {
  DateData,
  FriendDetailsApi,
  ProfessionalHistoryData,
  RelationshipCreateData,
  RelationshipUpdateData,
  SocialProfileData,
} from '../api/friend-details.js';
import type { FriendPhotosApi } from '../api/friend-photos.js';
import type { FriendNameSearchParams, FriendSearchApi } from '../api/friend-search.js';
import type { FriendListParams, FriendsApi, FriendUpdateData } from '../api/friends.js';
import type { MetInfoData } from '../api/met-info-data.js';
import type { PhoneData } from '../api/phone-data.js';
import type { UrlData } from '../api/url-data.js';
import { storeAction } from './store-action.js';

export interface FriendsStoreOptions {
  friendsApi: FriendsApi;
  friendDetailsApi: FriendDetailsApi;
  friendPhotosApi: FriendPhotosApi;
  friendSearchApi: FriendSearchApi;
  circlesApi: CirclesApi;
  logger: Logger;
}

export interface FriendsState {
  friends: FriendListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFriend: FriendResponse | null;
  relationshipTypes: RelationshipTypesGroupedResponse | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: FriendsState = {
  friends: [],
  total: 0,
  page: 1,
  pageSize: 25,
  totalPages: 0,
  currentFriend: null,
  relationshipTypes: null,
  isLoading: false,
  error: null,
};

interface Identified {
  id: string;
}

function appended<T>(items: T[] | undefined, item: T) {
  return [...(items ?? []), item];
}

function replaced<T extends Identified>(items: T[] | undefined, id: string, item: T) {
  return (items ?? []).map((existing) => (existing.id === id ? item : existing));
}

function removed<T extends Identified>(items: T[] | undefined, id: string) {
  return (items ?? []).filter((existing) => existing.id !== id);
}

/** Applies `patch` to the friend on display; a no-op when none is loaded. */
function patchCurrentFriend(state: FriendsState, patch: Partial<FriendResponse>) {
  if (state.currentFriend === null) {
    return { currentFriend: null };
  }
  return { currentFriend: { ...state.currentFriend, ...patch } };
}

function withoutFriend(state: FriendsState, friendId: string) {
  return {
    friends: state.friends.filter((friend) => friend.id !== friendId),
    currentFriend: state.currentFriend?.id === friendId ? null : state.currentFriend,
    total: state.total - 1,
  };
}

/**
 * The friend list page and the friend on display, with every sub-resource of that friend.
 * A failed action stores its message in `error` and rethrows.
 */
export class FriendsStore {
  public readonly subscribe: Readable<FriendsState>['subscribe'];
  public readonly isLoading: Readable<boolean>;
  public readonly currentFriend: Readable<FriendResponse | null>;
  public readonly list: Readable<FriendListItemResponse[]>;
  public readonly relationshipTypes: Readable<RelationshipTypesGroupedResponse | null>;
  private readonly state = writable(INITIAL_STATE);
  private readonly friendsApi: FriendsApi;
  private readonly friendDetailsApi: FriendDetailsApi;
  private readonly friendPhotosApi: FriendPhotosApi;
  private readonly friendSearchApi: FriendSearchApi;
  private readonly circlesApi: CirclesApi;
  private readonly logger: Logger;

  public constructor(options: FriendsStoreOptions) {
    this.friendsApi = options.friendsApi;
    this.friendDetailsApi = options.friendDetailsApi;
    this.friendPhotosApi = options.friendPhotosApi;
    this.friendSearchApi = options.friendSearchApi;
    this.circlesApi = options.circlesApi;
    this.logger = options.logger;
    this.subscribe = this.state.subscribe;
    this.isLoading = derived(this.state, (state) => state.isLoading);
    this.currentFriend = derived(this.state, (state) => state.currentFriend);
    this.list = derived(this.state, (state) => state.friends);
    this.relationshipTypes = derived(this.state, (state) => state.relationshipTypes);
  }

  //#region Friends

  public loadFriends(params: FriendListParams = {}) {
    return storeAction(
      this.state.update,
      () => this.friendsApi.listFriends(params),
      (_state, result) => ({
        friends: result.data,
        total: result.pagination.totalCount,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
      }),
      'Failed to load friends',
    );
  }

  public loadFriend(friendId: string) {
    return storeAction(
      this.state.update,
      () => this.friendsApi.getFriend(friendId),
      (_state, friend) => ({ currentFriend: friend }),
      'Failed to load friend',
      () => ({ currentFriend: null }),
    );
  }

  /** Refetches the friend in the background: a failure is logged, never thrown. */
  public async refreshFriend(friendId: string) {
    try {
      await this.loadFriend(friendId);
    } catch (err) {
      this.logger.warn({ err }, 'Failed to refresh friend');
    }
  }

  public createFriend(data: FriendCreateData) {
    return storeAction(
      this.state.update,
      () => this.friendsApi.createFriend(data),
      (_state, friend) => ({ currentFriend: friend }),
      'Failed to create friend',
    );
  }

  public updateFriend(friendId: string, data: FriendUpdateData) {
    return storeAction(
      this.state.update,
      () => this.friendsApi.updateFriend(friendId, data),
      (_state, friend) => ({ currentFriend: friend }),
      'Failed to update friend',
    );
  }

  public deleteFriend(friendId: string) {
    return storeAction(
      this.state.update,
      () => this.friendsApi.deleteFriend(friendId),
      (state) => withoutFriend(state, friendId),
      'Failed to delete friend',
    );
  }

  /** Served from the cache after the first successful load. */
  public async loadRelationshipTypes() {
    const cached = get(this.state).relationshipTypes;
    if (cached !== null) {
      return cached;
    }
    try {
      const types = await this.friendsApi.listRelationshipTypes();
      this.state.update((state) => ({ ...state, relationshipTypes: types }));
      return types;
    } catch (error) {
      this.recordFailure(error, 'Failed to load relationship types');
      throw error;
    }
  }

  public async searchFriends(params: FriendNameSearchParams) {
    try {
      return await this.friendSearchApi.searchFriends(params);
    } catch (error) {
      this.recordFailure(error, 'Failed to search friends');
      throw error;
    }
  }

  //#endregion

  //#region Contact details

  public addPhone(friendId: string, data: PhoneData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addPhone(friendId, data),
      (state, phone) =>
        patchCurrentFriend(state, { phones: appended(state.currentFriend?.phones, phone) }),
      'Failed to add phone',
    );
  }

  public updatePhone(friendId: string, phoneId: string, data: PhoneData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updatePhone(friendId, phoneId, data),
      (state, phone) =>
        patchCurrentFriend(state, {
          phones: replaced(state.currentFriend?.phones, phoneId, phone),
        }),
      'Failed to update phone',
    );
  }

  public deletePhone(friendId: string, phoneId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deletePhone(friendId, phoneId),
      (state) =>
        patchCurrentFriend(state, { phones: removed(state.currentFriend?.phones, phoneId) }),
      'Failed to delete phone',
    );
  }

  public addEmail(friendId: string, data: EmailData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addEmail(friendId, data),
      (state, email) =>
        patchCurrentFriend(state, { emails: appended(state.currentFriend?.emails, email) }),
      'Failed to add email',
    );
  }

  public updateEmail(friendId: string, emailId: string, data: EmailData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateEmail(friendId, emailId, data),
      (state, email) =>
        patchCurrentFriend(state, {
          emails: replaced(state.currentFriend?.emails, emailId, email),
        }),
      'Failed to update email',
    );
  }

  public deleteEmail(friendId: string, emailId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteEmail(friendId, emailId),
      (state) =>
        patchCurrentFriend(state, { emails: removed(state.currentFriend?.emails, emailId) }),
      'Failed to delete email',
    );
  }

  public addAddress(friendId: string, data: AddressData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addAddress(friendId, data),
      (state, address) =>
        patchCurrentFriend(state, {
          addresses: appended(state.currentFriend?.addresses, address),
        }),
      'Failed to add address',
    );
  }

  public updateAddress(friendId: string, addressId: string, data: AddressData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateAddress(friendId, addressId, data),
      (state, address) =>
        patchCurrentFriend(state, {
          addresses: replaced(state.currentFriend?.addresses, addressId, address),
        }),
      'Failed to update address',
    );
  }

  public deleteAddress(friendId: string, addressId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteAddress(friendId, addressId),
      (state) =>
        patchCurrentFriend(state, {
          addresses: removed(state.currentFriend?.addresses, addressId),
        }),
      'Failed to delete address',
    );
  }

  public addUrl(friendId: string, data: UrlData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addUrl(friendId, data),
      (state, url) => patchCurrentFriend(state, { urls: appended(state.currentFriend?.urls, url) }),
      'Failed to add URL',
    );
  }

  public updateUrl(friendId: string, urlId: string, data: UrlData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateUrl(friendId, urlId, data),
      (state, url) =>
        patchCurrentFriend(state, { urls: replaced(state.currentFriend?.urls, urlId, url) }),
      'Failed to update URL',
    );
  }

  public deleteUrl(friendId: string, urlId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteUrl(friendId, urlId),
      (state) => patchCurrentFriend(state, { urls: removed(state.currentFriend?.urls, urlId) }),
      'Failed to delete URL',
    );
  }

  //#endregion

  //#region Photo

  public uploadPhoto(friendId: string, file: File) {
    return storeAction(
      this.state.update,
      () => this.friendPhotosApi.uploadPhoto(friendId, file),
      (state, photo) =>
        patchCurrentFriend(state, {
          photoUrl: photo.photoUrl,
          photoThumbnailUrl: photo.photoThumbnailUrl,
        }),
      'Failed to upload photo',
    );
  }

  public deletePhoto(friendId: string) {
    return storeAction(
      this.state.update,
      () => this.friendPhotosApi.deletePhoto(friendId),
      (state) => patchCurrentFriend(state, { photoUrl: undefined, photoThumbnailUrl: undefined }),
      'Failed to delete photo',
    );
  }

  //#endregion

  //#region Dates and met info

  public addDate(friendId: string, data: DateData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addDate(friendId, data),
      (state, date) =>
        patchCurrentFriend(state, { dates: appended(state.currentFriend?.dates, date) }),
      'Failed to add date',
    );
  }

  public updateDate(friendId: string, dateId: string, data: DateData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateDate(friendId, dateId, data),
      (state, date) =>
        patchCurrentFriend(state, { dates: replaced(state.currentFriend?.dates, dateId, date) }),
      'Failed to update date',
    );
  }

  public deleteDate(friendId: string, dateId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteDate(friendId, dateId),
      (state) => patchCurrentFriend(state, { dates: removed(state.currentFriend?.dates, dateId) }),
      'Failed to delete date',
    );
  }

  public setMetInfo(friendId: string, data: MetInfoData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.setMetInfo(friendId, data),
      (state, metInfo) => patchCurrentFriend(state, { metInfo }),
      'Failed to set met info',
    );
  }

  //#endregion

  //#region Social profiles and professional history

  public addSocialProfile(friendId: string, data: SocialProfileData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addSocialProfile(friendId, data),
      (state, profile) =>
        patchCurrentFriend(state, {
          socialProfiles: appended(state.currentFriend?.socialProfiles, profile),
        }),
      'Failed to add social profile',
    );
  }

  public updateSocialProfile(friendId: string, profileId: string, data: SocialProfileData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateSocialProfile(friendId, profileId, data),
      (state, profile) =>
        patchCurrentFriend(state, {
          socialProfiles: replaced(state.currentFriend?.socialProfiles, profileId, profile),
        }),
      'Failed to update social profile',
    );
  }

  public deleteSocialProfile(friendId: string, profileId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteSocialProfile(friendId, profileId),
      (state) =>
        patchCurrentFriend(state, {
          socialProfiles: removed(state.currentFriend?.socialProfiles, profileId),
        }),
      'Failed to delete social profile',
    );
  }

  public addProfessionalHistory(friendId: string, data: ProfessionalHistoryData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addProfessionalHistory(friendId, data),
      (state, history) =>
        patchCurrentFriend(state, {
          professionalHistory: appended(state.currentFriend?.professionalHistory, history),
        }),
      'Failed to add professional history',
    );
  }

  public updateProfessionalHistory(
    friendId: string,
    historyId: string,
    data: ProfessionalHistoryData,
  ) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateProfessionalHistory(friendId, historyId, data),
      (state, history) =>
        patchCurrentFriend(state, {
          professionalHistory: replaced(
            state.currentFriend?.professionalHistory,
            historyId,
            history,
          ),
        }),
      'Failed to update professional history',
    );
  }

  public deleteProfessionalHistory(friendId: string, historyId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteProfessionalHistory(friendId, historyId),
      (state) =>
        patchCurrentFriend(state, {
          professionalHistory: removed(state.currentFriend?.professionalHistory, historyId),
        }),
      'Failed to delete professional history',
    );
  }

  //#endregion

  //#region Relationships and circles

  public addRelationship(friendId: string, data: RelationshipCreateData) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.addRelationship(friendId, data),
      (state, relationship) =>
        patchCurrentFriend(state, {
          relationships: appended(state.currentFriend?.relationships, relationship),
        }),
      'Failed to add relationship',
    );
  }

  public updateRelationship(
    friendId: string,
    relationshipId: string,
    data: RelationshipUpdateData,
  ) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.updateRelationship(friendId, relationshipId, data),
      (state, relationship) =>
        patchCurrentFriend(state, {
          relationships: replaced(state.currentFriend?.relationships, relationshipId, relationship),
        }),
      'Failed to update relationship',
    );
  }

  public deleteRelationship(friendId: string, relationshipId: string) {
    return storeAction(
      this.state.update,
      () => this.friendDetailsApi.deleteRelationship(friendId, relationshipId),
      (state) =>
        patchCurrentFriend(state, {
          relationships: removed(state.currentFriend?.relationships, relationshipId),
        }),
      'Failed to delete relationship',
    );
  }

  public addCircle(friendId: string, circleId: string) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.addFriendToCircle(friendId, circleId),
      (state, circle) =>
        patchCurrentFriend(state, { circles: appended(state.currentFriend?.circles, circle) }),
      'Failed to add to circle',
    );
  }

  public removeCircle(friendId: string, circleId: string) {
    return storeAction(
      this.state.update,
      () => this.circlesApi.removeFriendFromCircle(friendId, circleId),
      (state) =>
        patchCurrentFriend(state, { circles: removed(state.currentFriend?.circles, circleId) }),
      'Failed to remove from circle',
    );
  }

  //#endregion

  private recordFailure(error: unknown, fallbackMessage: string) {
    const message = error instanceof ApiError ? error.message : fallbackMessage;
    this.state.update((state) => ({ ...state, error: message }));
  }
}
