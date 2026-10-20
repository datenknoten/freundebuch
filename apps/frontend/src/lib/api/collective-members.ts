import {
  CollectiveMemberResponseSchema,
  type MembershipCreateInputSchema,
  type MembershipDeactivateInputSchema,
  type MembershipUpdateInputSchema,
  type RelationshipPreviewInputSchema,
  RelationshipPreviewResponseSchema,
  SuccessResponseSchema,
} from '$shared';
import type { ApiClient } from './api-client.js';

export interface CollectiveMembersApiOptions {
  client: ApiClient;
}

export interface MembershipCreateData {
  friendId: string;
  roleId: string;
  joinedDate?: string | null;
  notes?: string | null;
  shouldSkipAutoRelationships?: boolean;
}

export interface MembershipUpdateData {
  roleId?: string;
  joinedDate?: string | null;
  notes?: string | null;
}

export interface MembershipDeactivateData {
  reason?: string | null;
  inactiveDate?: string | null;
}

export interface RelationshipPreviewData {
  friendId: string;
  roleId: string;
}

function mapMembershipCreateInput(data: MembershipCreateData) {
  return {
    friend_id: data.friendId,
    role_id: data.roleId,
    joined_date: data.joinedDate,
    notes: data.notes,
    skip_auto_relationships: data.shouldSkipAutoRelationships,
  } satisfies typeof MembershipCreateInputSchema.inferIn;
}

function mapMembershipUpdateInput(data: MembershipUpdateData) {
  return {
    role_id: data.roleId,
    joined_date: data.joinedDate,
    notes: data.notes,
  } satisfies typeof MembershipUpdateInputSchema.inferIn;
}

function mapMembershipDeactivateInput(data: MembershipDeactivateData) {
  return {
    reason: data.reason,
    inactive_date: data.inactiveDate,
  } satisfies typeof MembershipDeactivateInputSchema.inferIn;
}

export class CollectiveMembersApi {
  private readonly client: ApiClient;

  public constructor(options: CollectiveMembersApiOptions) {
    this.client = options.client;
  }

  /** The relationships that adding the friend in the role would create. */
  public previewMemberRelationships(
    collectiveId: string,
    data: RelationshipPreviewData,
    signal?: AbortSignal,
  ) {
    const input = {
      friend_id: data.friendId,
      role_id: data.roleId,
    } satisfies typeof RelationshipPreviewInputSchema.inferIn;
    return this.client.request(
      RelationshipPreviewResponseSchema,
      `/api/collectives/${collectiveId}/members/preview`,
      { method: 'POST', body: JSON.stringify(input), signal },
    );
  }

  public addMember(collectiveId: string, data: MembershipCreateData) {
    return this.client.request(
      CollectiveMemberResponseSchema,
      `/api/collectives/${collectiveId}/members`,
      { method: 'POST', body: JSON.stringify(mapMembershipCreateInput(data)) },
    );
  }

  public async removeMember(collectiveId: string, memberId: string) {
    await this.client.request(
      SuccessResponseSchema,
      `/api/collectives/${collectiveId}/members/${memberId}`,
      { method: 'DELETE' },
    );
  }

  public updateMemberRole(collectiveId: string, memberId: string, data: MembershipUpdateData) {
    return this.client.request(
      CollectiveMemberResponseSchema,
      `/api/collectives/${collectiveId}/members/${memberId}/role`,
      { method: 'PUT', body: JSON.stringify(mapMembershipUpdateInput(data)) },
    );
  }

  public deactivateMember(
    collectiveId: string,
    memberId: string,
    data: MembershipDeactivateData = {},
  ) {
    return this.client.request(
      CollectiveMemberResponseSchema,
      `/api/collectives/${collectiveId}/members/${memberId}/deactivate`,
      { method: 'POST', body: JSON.stringify(mapMembershipDeactivateInput(data)) },
    );
  }

  public reactivateMember(collectiveId: string, memberId: string) {
    return this.client.request(
      CollectiveMemberResponseSchema,
      `/api/collectives/${collectiveId}/members/${memberId}/reactivate`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }
}
