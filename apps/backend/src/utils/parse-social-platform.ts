import { type SocialPlatform, SocialPlatformSchema } from '@freundebuch/shared/index.js';
import { makeEnumParser } from './make-enum-parser.js';

export const parseSocialPlatform = makeEnumParser<SocialPlatform>(
  SocialPlatformSchema,
  'SocialPlatform',
);
