import type { AddressInputSchema, AddressType } from '$shared';

/** camelCase companion of `AddressInputSchema`, shared by the friend and collective address endpoints. */
export interface AddressData {
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  addressType: AddressType;
  label?: string;
  isPrimary?: boolean;
}

export function mapAddressInput(data: AddressData) {
  return {
    street_line1: data.streetLine1,
    street_line2: data.streetLine2,
    city: data.city,
    state_province: data.stateProvince,
    postal_code: data.postalCode,
    country: data.country,
    address_type: data.addressType,
    label: data.label,
    is_primary: data.isPrimary,
  } satisfies typeof AddressInputSchema.inferIn;
}
