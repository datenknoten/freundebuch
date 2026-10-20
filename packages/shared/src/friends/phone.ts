import type { PhoneType } from './phone-type.js';

/** Phone number in API responses */
export interface Phone {
  id: string;
  phoneNumber: string;
  phoneType: PhoneType;
  label?: string;
  isPrimary: boolean;
  createdAt: string;
}
