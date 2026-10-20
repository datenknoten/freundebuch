import type { PhoneInputSchema, PhoneType } from '$shared';

/** camelCase companion of `PhoneInputSchema`, shared by the friend and collective phone endpoints. */
export interface PhoneData {
  phoneNumber: string;
  phoneType: PhoneType;
  label?: string;
  isPrimary?: boolean;
}

export function mapPhoneInput(data: PhoneData) {
  return {
    phone_number: data.phoneNumber,
    phone_type: data.phoneType,
    label: data.label,
    is_primary: data.isPrimary,
  } satisfies typeof PhoneInputSchema.inferIn;
}
