import { type } from 'arktype';
import { CircleSummaryResponseSchema } from '../circles/circle-summary-response.js';
import { AddressResponseSchema } from './address-response.js';
import { EmailResponseSchema } from './email-response.js';
import { FriendDateResponseSchema } from './friend-date-response.js';
import { MetInfoResponseSchema } from './met-info-response.js';
import { PhoneResponseSchema } from './phone-response.js';
import { ProfessionalHistoryResponseSchema } from './professional-history-response.js';
import { RelationshipResponseSchema } from './relationship-response.js';
import { SocialProfileResponseSchema } from './social-profile-response.js';
import { UrlResponseSchema } from './url-response.js';

/** Full friend with all sub-resources */
export const FriendResponseSchema = type({
  id: 'string',
  displayName: 'string',
  'nickname?': 'string',
  'namePrefix?': 'string',
  'nameFirst?': 'string',
  'nameMiddle?': 'string',
  'nameLast?': 'string',
  'nameSuffix?': 'string',
  'maidenName?': 'string',
  'photoUrl?': 'string',
  'photoThumbnailUrl?': 'string',
  phones: PhoneResponseSchema.array(),
  emails: EmailResponseSchema.array(),
  addresses: AddressResponseSchema.array(),
  urls: UrlResponseSchema.array(),
  professionalHistory: ProfessionalHistoryResponseSchema.array(),
  /** Personal interests, not employment-related */
  'interests?': 'string',
  'dates?': FriendDateResponseSchema.array(),
  'metInfo?': MetInfoResponseSchema,
  'socialProfiles?': SocialProfileResponseSchema.array(),
  'relationships?': RelationshipResponseSchema.array(),
  circles: CircleSummaryResponseSchema.array(),
  isFavorite: 'boolean',
  'archivedAt?': 'string',
  'archiveReason?': 'string',
  createdAt: 'string',
  updatedAt: 'string',
});

export type FriendResponse = typeof FriendResponseSchema.infer;
