import type { SocialPlatform, SocialProfileResponse } from '@freundebuch/shared/index.js';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import {
  createSocialProfile,
  deleteSocialProfile,
  getSocialProfilesByFriendId,
  type IDeleteSocialProfileResult,
  type IGetSocialProfilesByFriendIdResult,
  updateSocialProfile,
} from '../../../models/queries/friend-social-profiles.queries.js';
import { parseSocialPlatform } from '../../../utils/parse-social-platform.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

export interface SocialProfileData {
  platform: SocialPlatform;
  profileUrl?: string | null;
  username?: string | null;
}

const mapRow = (row: IGetSocialProfilesByFriendIdResult): SocialProfileResponse => ({
  id: row.external_id,
  platform: parseSocialPlatform(row.platform),
  profileUrl: row.profile_url ?? undefined,
  username: row.username ?? undefined,
  createdAt: row.created_at.toISOString(),
});

/**
 * SocialProfileService handles all social profile operations for friends.
 * Extends SubResourceService for common CRUD operations.
 * Note: Social profiles do not have a primary flag.
 */
export class SocialProfileService extends SubResourceService<
  SocialProfileData,
  SocialProfileResponse,
  IGetSocialProfilesByFriendIdResult,
  IGetSocialProfilesByFriendIdResult,
  IDeleteSocialProfileResult
> {
  constructor(options: SubResourceServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'social profile',
        resourceLabel: 'Social profile',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: false,

        createFn: async ({ userExternalId, ownerExternalId: friendExternalId, data }, client) => {
          return createSocialProfile.run(
            {
              userExternalId,
              friendExternalId,
              platform: data.platform,
              profileUrl: data.profileUrl ?? null,
              username: data.username ?? null,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) => {
          return updateSocialProfile.run(
            {
              userExternalId,
              friendExternalId,
              profileExternalId: resourceExternalId,
              platform: data.platform,
              profileUrl: data.profileUrl ?? null,
              username: data.username ?? null,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) => {
          return deleteSocialProfile.run(
            {
              userExternalId,
              friendExternalId,
              profileExternalId: resourceExternalId,
            },
            client,
          );
        },

        listFn: async ({ userExternalId, ownerExternalId: friendExternalId }, client) => {
          return getSocialProfilesByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
