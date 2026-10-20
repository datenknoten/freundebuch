import { type } from 'arktype';

export const SocialPlatformSchema = type(
  '"linkedin" | "twitter" | "facebook" | "instagram" | "github" | "other"',
);

export type SocialPlatform = typeof SocialPlatformSchema.infer;
