import { type } from 'arktype';
import type { Logger } from 'pino';
import { safeArray } from './safe-array.js';

const SocialProfileJsonRowSchema = type({
  external_id: 'string',
  platform: 'string',
  profile_url: 'string | null',
  username: 'string | null',
  created_at: 'string',
});

export type SocialProfileJsonRow = typeof SocialProfileJsonRowSchema.infer;

export function parseSocialProfilesJson(value: unknown, logger: Logger): SocialProfileJsonRow[] {
  return safeArray(value, SocialProfileJsonRowSchema, logger, 'socialProfiles');
}
