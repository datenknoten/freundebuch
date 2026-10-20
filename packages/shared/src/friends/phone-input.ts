import { type } from 'arktype';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { PhoneTypeSchema } from './phone-type.js';

/**
 * A non-empty string that is a valid phone number.
 *
 * The validity check is narrowed onto the field itself (rather than the whole
 * object) so validation errors point at `phone_number` and quote only the
 * offending value instead of dumping the entire request body.
 */
const PhoneNumberSchema = type('string > 0').narrow((value, ctx) => {
  if (!isValidPhoneNumber(value)) {
    return ctx.mustBe('a valid phone number');
  }
  return true;
});

/** Schema for creating/updating a phone number */
export const PhoneInputSchema = type({
  phone_number: PhoneNumberSchema,
  phone_type: PhoneTypeSchema,
  'label?': 'string',
  'is_primary?': 'boolean',
});

export type PhoneInput = typeof PhoneInputSchema.infer;
