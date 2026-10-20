import { type } from 'arktype';
import { AddressInputSchema } from './address-input.js';
import { DateInputSchema } from './date-input.js';
import { EmailInputSchema } from './email-input.js';
import { MAX_SUB_RESOURCES } from './max-sub-resources.js';
import { MetInfoInputSchema } from './met-info-input.js';
import { PhoneInputSchema } from './phone-input.js';
import { ProfessionalHistoryInputSchema } from './professional-history-input.js';
import { SocialProfileInputSchema } from './social-profile-input.js';
import { UrlInputSchema } from './url-input.js';

/** Schema for creating a new friend */
export const FriendCreateSchema = type({
  display_name: 'string > 0',
  'nickname?': 'string',
  'name_prefix?': 'string',
  'name_first?': 'string',
  'name_middle?': 'string',
  'name_last?': 'string',
  'name_suffix?': 'string',
  'maiden_name?': 'string',
  // Epic 1A sub-resources
  'phones?': PhoneInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'emails?': EmailInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'addresses?': AddressInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'urls?': UrlInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  // Professional history (replaces job_title, organization, department, work_notes)
  'professional_history?': ProfessionalHistoryInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  // Personal interests (not employment-related)
  'interests?': 'string',
  // Epic 1B: Extended sub-resources
  'dates?': DateInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
  'met_info?': MetInfoInputSchema,
  'social_profiles?': SocialProfileInputSchema.array().atMostLength(MAX_SUB_RESOURCES),
}).narrow((data, ctx) => {
  // Validate only one primary phone
  if (data.phones) {
    const primaryCount = data.phones.filter((p) => p.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary phone');
      return false;
    }
  }
  // Validate only one primary email
  if (data.emails) {
    const primaryCount = data.emails.filter((e) => e.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary email');
      return false;
    }
  }
  // Validate only one primary address
  if (data.addresses) {
    const primaryCount = data.addresses.filter((a) => a.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary address');
      return false;
    }
  }
  // Validate only one birthday date
  if (data.dates) {
    const birthdayCount = data.dates.filter((d) => d.date_type === 'birthday').length;
    if (birthdayCount > 1) {
      ctx.mustBe('a friend with at most one birthday');
      return false;
    }
  }
  // Validate only one primary professional history entry
  if (data.professional_history) {
    const primaryCount = data.professional_history.filter((p) => p.is_primary === true).length;
    if (primaryCount > 1) {
      ctx.mustBe('a friend with at most one primary professional history entry');
      return false;
    }
  }
  return true;
});

export type FriendCreateInput = typeof FriendCreateSchema.infer;
