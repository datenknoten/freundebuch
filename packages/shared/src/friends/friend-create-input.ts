import { type Traversal, type } from 'arktype';
import { AddressInputSchema } from './address-input.js';
import { DateInputSchema } from './date-input.js';
import { EmailInputSchema } from './email-input.js';
import { MAX_SUB_RESOURCES } from './max-sub-resources.js';
import { MetInfoInputSchema } from './met-info-input.js';
import { PhoneInputSchema } from './phone-input.js';
import { ProfessionalHistoryInputSchema } from './professional-history-input.js';
import { SocialProfileInputSchema } from './social-profile-input.js';
import { UrlInputSchema } from './url-input.js';

const FriendCreateFieldsSchema = type({
  display_name: 'string > 0',
  'nickname?': 'string',
  'name_prefix?': 'string',
  'name_first?': 'string',
  'name_middle?': 'string',
  'name_last?': 'string',
  'name_suffix?': 'string',
  'maiden_name?': 'string',
  phones: PhoneInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  emails: EmailInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  addresses: AddressInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  urls: UrlInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  // Professional history (replaces job_title, organization, department, work_notes)
  professional_history: ProfessionalHistoryInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  // Personal interests, not employment-related.
  'interests?': 'string',
  dates: DateInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
  'met_info?': MetInfoInputSchema,
  social_profiles: SocialProfileInputSchema.array()
    .atMostLength(MAX_SUB_RESOURCES)
    .default(() => []),
});

function isPrimary(entry: { is_primary: boolean }) {
  return entry.is_primary === true;
}

function isBirthday(entry: { date_type: string }) {
  return entry.date_type === 'birthday';
}

function checkSingleFlags(data: typeof FriendCreateFieldsSchema.infer, ctx: Traversal) {
  if (data.phones.filter(isPrimary).length > 1) {
    return ctx.mustBe('a friend with at most one primary phone');
  }
  if (data.emails.filter(isPrimary).length > 1) {
    return ctx.mustBe('a friend with at most one primary email');
  }
  if (data.addresses.filter(isPrimary).length > 1) {
    return ctx.mustBe('a friend with at most one primary address');
  }
  if (data.dates.filter(isBirthday).length > 1) {
    return ctx.mustBe('a friend with at most one birthday');
  }
  if (data.professional_history.filter(isPrimary).length > 1) {
    return ctx.mustBe('a friend with at most one primary professional history entry');
  }
  return true;
}

export const FriendCreateInputSchema = FriendCreateFieldsSchema.narrow(checkSingleFlags);

export type FriendCreateInput = typeof FriendCreateInputSchema.infer;
