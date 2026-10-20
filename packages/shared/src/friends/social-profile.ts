import type { SocialPlatform } from './social-platform.js';

/** Social profile in API responses */
export interface SocialProfile {
  id: string;
  platform: SocialPlatform;
  profileUrl?: string;
  username?: string;
  createdAt: string;
}
