import { type Traversal, type } from 'arktype';
import { SocialPlatformSchema } from './social-platform.js';

const URL_PATTERN = /^https?:\/\/.+/i;

const SocialProfileFieldsSchema = type({
  platform: SocialPlatformSchema,
  'profile_url?': 'string | null',
  'username?': 'string | null',
});

function checkSocialProfile(data: typeof SocialProfileFieldsSchema.infer, ctx: Traversal) {
  const profileUrl = data.profile_url ?? '';
  const hasUrl = profileUrl.trim().length > 0;
  const hasUsername = (data.username ?? '').trim().length > 0;

  if (hasUrl === false && hasUsername === false) {
    return ctx.mustBe('a social profile with either profile_url or username');
  }
  if (hasUrl === true && URL_PATTERN.test(profileUrl) === false) {
    return ctx.mustBe('a social profile with a valid URL (must start with http:// or https://)');
  }
  return true;
}

export const SocialProfileInputSchema = SocialProfileFieldsSchema.narrow(checkSocialProfile);

export type SocialProfileInput = typeof SocialProfileInputSchema.infer;
