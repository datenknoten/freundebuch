import type { AddressType } from './address-type.js';

/** Postal address in API responses */
export interface Address {
  id: string;
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  addressType: AddressType;
  label?: string;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}
