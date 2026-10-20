import { type } from 'arktype';
import { SocialPlatformSchema } from './social-platform.js';

export const SocialProfileResponseSchema = type({
  id: 'string',
  platform: SocialPlatformSchema,
  'profileUrl?': 'string',
  'username?': 'string',
  createdAt: 'string',
});

export type SocialProfileResponse = typeof SocialProfileResponseSchema.infer;
