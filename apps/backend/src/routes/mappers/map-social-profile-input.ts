import type { SocialProfileInput } from '@freundebuch/shared/index.js';
import type { SocialProfileData } from '../../services/friends/sub-resources/social-profile.service.js';

export function mapSocialProfileInput(input: SocialProfileInput) {
  return {
    platform: input.platform,
    profileUrl: input.profile_url,
    username: input.username,
  } satisfies SocialProfileData;
}
