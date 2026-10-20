import type { AddressInput } from '@freundebuch/shared/index.js';
import type { AddressData } from '../../services/friends/sub-resources/address.service.js';

export function mapAddressInput(input: AddressInput) {
  return {
    streetLine1: input.street_line1,
    streetLine2: input.street_line2,
    city: input.city,
    stateProvince: input.state_province,
    postalCode: input.postal_code,
    country: input.country,
    addressType: input.address_type,
    label: input.label,
    isPrimary: input.is_primary,
  } satisfies AddressData;
}
