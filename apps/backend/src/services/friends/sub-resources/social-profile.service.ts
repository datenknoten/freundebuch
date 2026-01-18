import type {
  SocialPlatform,
  SocialProfile,
  SocialProfileInput,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  createSocialProfile,
  deleteSocialProfile,
  type IDeleteSocialProfileResult,
  type IGetSocialProfilesByFriendIdResult,
  updateSocialProfile,
} from '../../../models/queries/friend-social-profiles.queries.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

/**
 * SocialProfileService handles all social profile operations for friends.
 * Extends SubResourceService for common CRUD operations.
 * Note: Social profiles do not have a primary flag.
 */
export class SocialProfileService extends SubResourceService<
  SocialProfileInput,
  SocialProfile,
  IGetSocialProfilesByFriendIdResult,
  IGetSocialProfilesByFriendIdResult,
  IDeleteSocialProfileResult
> {
  constructor(options: SubResourceServiceOptions) {
    super(options, {
      resourceName: 'social profile',
      hasPrimaryFlag: false,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createSocialProfile.run(
          {
            userExternalId,
            friendExternalId,
            platform: input.platform,
            profileUrl: input.profile_url ?? null,
            username: input.username ?? null,
          },
          client as pg.Pool,
        );
      },

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateSocialProfile.run(
          {
            userExternalId,
            friendExternalId,
            profileExternalId: resourceExternalId,
            platform: input.platform,
            profileUrl: input.profile_url ?? null,
            username: input.username ?? null,
          },
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteSocialProfile.run(
          {
            userExternalId,
            friendExternalId,
            profileExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      mapResult: (row): SocialProfile => ({
        id: row.external_id,
        platform: row.platform as SocialPlatform,
        profileUrl: row.profile_url ?? undefined,
        username: row.username ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
