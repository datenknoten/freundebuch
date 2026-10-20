import {
  ContactCollectiveSummaryResponseSchema,
  DashboardResponseSchema,
  FriendListResponseSchema,
  FriendResponseSchema,
  type FriendSortBy,
  type FriendUpdateInputSchema,
  MessageResponseSchema,
  RelationshipTypesGroupedResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';
import { type FriendCreateData, mapFriendCreateInput } from './friend-create-data.js';
import { withQuery } from './with-query.js';

export interface FriendsApiOptions {
  client: ApiClient;
}

export interface FriendListParams {
  page?: number;
  pageSize?: number;
  sortBy?: FriendSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardParams {
  days?: number;
  limit?: number;
}

/** `null` clears a field; an omitted field stays unchanged. */
export interface FriendUpdateData {
  displayName?: string;
  nickname?: string | null;
  namePrefix?: string | null;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  nameSuffix?: string | null;
  maidenName?: string | null;
  interests?: string | null;
}

const ContactCollectiveSummaryResponseListSchema = ContactCollectiveSummaryResponseSchema.array();

function mapFriendUpdateInput(data: FriendUpdateData) {
  return {
    display_name: data.displayName,
    nickname: data.nickname,
    name_prefix: data.namePrefix,
    name_first: data.nameFirst,
    name_middle: data.nameMiddle,
    name_last: data.nameLast,
    name_suffix: data.nameSuffix,
    maiden_name: data.maidenName,
    interests: data.interests,
  } satisfies typeof FriendUpdateInputSchema.inferIn;
}

function mapFriendListParams(params: FriendListParams) {
  return {
    page: params.page,
    page_size: params.pageSize,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
  };
}

export class FriendsApi {
  private readonly client: ApiClient;

  public constructor(options: FriendsApiOptions) {
    this.client = options.client;
  }

  public listFriends(params: FriendListParams = {}) {
    return this.client.request(
      FriendListResponseSchema,
      withQuery('/api/friends', mapFriendListParams(params)),
    );
  }

  public getFriend(friendId: string) {
    return this.client.request(FriendResponseSchema, `/api/friends/${friendId}`);
  }

  public createFriend(data: FriendCreateData) {
    return this.client.request(FriendResponseSchema, '/api/friends', {
      method: 'POST',
      body: JSON.stringify(mapFriendCreateInput(data)),
    });
  }

  public updateFriend(friendId: string, data: FriendUpdateData) {
    return this.client.request(FriendResponseSchema, `/api/friends/${friendId}`, {
      method: 'PUT',
      body: JSON.stringify(mapFriendUpdateInput(data)),
    });
  }

  /** Soft-deletes the friend. */
  public async deleteFriend(friendId: string) {
    await this.client.request(MessageResponseSchema, `/api/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  public listRelationshipTypes() {
    return this.client.request(
      RelationshipTypesGroupedResponseSchema,
      '/api/friends/relationship-types',
    );
  }

  /** Upcoming dates and the network graph in one request. */
  public getDashboard(params: DashboardParams = {}) {
    return this.client.request(
      DashboardResponseSchema,
      withQuery('/api/friends/dashboard', { days: params.days, limit: params.limit }),
    );
  }

  public listFriendCollectives(friendId: string) {
    return this.client.request(
      ContactCollectiveSummaryResponseListSchema,
      `/api/friends/${friendId}/collectives`,
    );
  }
}
