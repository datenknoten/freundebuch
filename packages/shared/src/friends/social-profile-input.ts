import { type } from 'arktype';
import { SocialPlatformSchema } from './social-platform.js';

// Simple URL pattern for validation
const URL_PATTERN = /^https?:\/\/.+/i;

/** Schema for creating/updating a social profile */
export const SocialProfileInputSchema = type({
  platform: SocialPlatformSchema,
  'profile_url?': 'string | null',
  'username?': 'string | null',
}).narrow((data, ctx) => {
  // At least one of profile_url or username must be provided (non-empty)
  const hasUrl = data.profile_url && data.profile_url.trim().length > 0;
  const hasUsername = data.username && data.username.trim().length > 0;

  if (!hasUrl && !hasUsername) {
    ctx.mustBe('a social profile with either profile_url or username');
    return false;
  }

  // If profile_url is provided and non-empty, validate it's a valid URL
  if (hasUrl && !URL_PATTERN.test(data.profile_url as string)) {
    ctx.mustBe('a social profile with a valid URL (must start with http:// or https://)');
    return false;
  }

  return true;
});

export type SocialProfileInput = typeof SocialProfileInputSchema.infer;
