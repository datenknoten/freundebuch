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

function mapRow(row: IGetSocialProfilesByFriendIdResult) {
  return {
    id: row.external_id,
    platform: parseSocialPlatform(row.platform),
    profileUrl: row.profile_url ?? undefined,
    username: row.username ?? undefined,
    createdAt: row.created_at.toISOString(),
  } satisfies SocialProfileResponse;
}

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

        async createFn({ userExternalId, ownerExternalId: friendExternalId, data }, client) {
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

        async updateFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) {
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

        async deleteFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) {
          return deleteSocialProfile.run(
            {
              userExternalId,
              friendExternalId,
              profileExternalId: resourceExternalId,
            },
            client,
          );
        },

        async listFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return getSocialProfilesByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });
  }
}
