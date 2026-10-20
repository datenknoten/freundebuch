// Generated from one config by createSubResourceRouter.
import { SocialProfileInputSchema } from '@freundebuch/shared/index.js';
import type { SocialProfileService } from '../../../services/friends/sub-resources/social-profile.service.js';
import { createSubResourceRouter } from '../../base/sub-resource.router.js';
import { mapSocialProfileInput } from '../../mappers/map-social-profile-input.js';

export interface SocialProfilesRoutesOptions {
  socialProfileService: SocialProfileService;
}

export function createSocialProfilesRoutes(options: SocialProfilesRoutesOptions) {
  return createSubResourceRouter({
    ownerParam: 'id',
    ownerLabel: 'friend ID',
    resourceParam: 'profileId',
    resourceLabel: 'Social profile',
    schema: SocialProfileInputSchema,
    mapInput: mapSocialProfileInput,
    service: options.socialProfileService,
  });
}
