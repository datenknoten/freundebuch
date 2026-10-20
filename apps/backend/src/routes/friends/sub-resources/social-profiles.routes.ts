// Generated from one config by createSubResourceRouter.
import { SocialProfileInputSchema } from '@freundebuch/shared/index.js';
import type { Hono } from 'hono';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
import type { SocialProfileService } from '../../../services/friends/sub-resources/social-profile.service.js';
import type { AppContext } from '../../../types/context.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';

export interface SocialProfilesRoutesOptions {
  socialProfileService: SocialProfileService;
}

export function createSocialProfilesRoutes(options: SocialProfilesRoutesOptions): Hono<AppContext> {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'profileId',
    resourceLabel: 'Social profile',
    schema: SocialProfileInputSchema,
    ownerNotFound: FriendNotFoundError,
    service: options.socialProfileService,
  });
}
