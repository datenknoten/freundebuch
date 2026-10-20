import type { PhoneInput } from '@freundebuch/shared/index.js';
import type { PhoneData } from '../../services/friends/sub-resources/phone.service.js';

export function mapPhoneInput(input: PhoneInput) {
  return {
    phoneNumber: input.phone_number,
    phoneType: input.phone_type,
    label: input.label,
    isPrimary: input.is_primary,
  } satisfies PhoneData;
}
