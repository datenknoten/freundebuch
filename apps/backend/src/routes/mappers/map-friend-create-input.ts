import type { FriendCreateInput } from '@freundebuch/shared/index.js';
import { mapAddressInput } from './map-address-input.js';
import { mapDateInput } from './map-date-input.js';
import { mapEmailInput } from './map-email-input.js';
import { mapMetInfoInput } from './map-met-info-input.js';
import { mapPhoneInput } from './map-phone-input.js';
import { mapProfessionalHistoryInput } from './map-professional-history-input.js';
import { mapSocialProfileInput } from './map-social-profile-input.js';
import { mapUrlInput } from './map-url-input.js';

export function mapFriendCreateInput(input: FriendCreateInput) {
  return {
    displayName: input.display_name,
    nickname: input.nickname,
    namePrefix: input.name_prefix,
    nameFirst: input.name_first,
    nameMiddle: input.name_middle,
    nameLast: input.name_last,
    nameSuffix: input.name_suffix,
    maidenName: input.maiden_name,
    interests: input.interests,
    phones: input.phones.map(mapPhoneInput),
    emails: input.emails.map(mapEmailInput),
    addresses: input.addresses.map(mapAddressInput),
    urls: input.urls.map(mapUrlInput),
    dates: input.dates.map(mapDateInput),
    socialProfiles: input.social_profiles.map(mapSocialProfileInput),
    professionalHistory: input.professional_history.map(mapProfessionalHistoryInput),
    ...(input.met_info !== undefined && { metInfo: mapMetInfoInput(input.met_info) }),
  };
}
