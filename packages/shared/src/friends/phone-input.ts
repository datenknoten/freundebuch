import { type Traversal, type } from 'arktype';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { PhoneTypeSchema } from './phone-type.js';

function checkPhoneNumber(value: string, ctx: Traversal) {
  if (isValidPhoneNumber(value) === false) {
    return ctx.mustBe('a valid phone number');
  }
  return true;
}

/**
 * The validity check is narrowed onto the field itself (rather than the whole
 * object) so validation errors point at `phone_number` and quote only the
 * offending value instead of dumping the entire request body.
 */
const PhoneNumberSchema = type('string > 0').narrow(checkPhoneNumber);

export const PhoneInputSchema = type({
  phone_number: PhoneNumberSchema,
  phone_type: PhoneTypeSchema,
  'label?': 'string',
  is_primary: 'boolean = false',
});

export type PhoneInput = typeof PhoneInputSchema.infer;
