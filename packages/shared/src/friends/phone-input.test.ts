import { describe, expect, it } from 'vitest';
import { PhoneInputSchema } from './phone-input.js';

describe('PhoneInputSchema', () => {
  it('accepts a valid E.164 phone number and defaults is_primary to false', () => {
    const result = PhoneInputSchema({
      phone_number: '+4915112345678',
      phone_type: 'mobile',
    });
    expect(result).toEqual({
      phone_number: '+4915112345678',
      phone_type: 'mobile',
      is_primary: false,
    });
  });

  it('rejects an invalid phone number', () => {
    const result = PhoneInputSchema({
      phone_number: 'not-a-number',
      phone_type: 'mobile',
    });
    expect(result.summary).toMatchInlineSnapshot(
      `"phone_number must be a valid phone number (was "not-a-number")"`,
    );
  });

  it('rejects an empty phone number', () => {
    const result = PhoneInputSchema({
      phone_number: '',
      phone_type: 'home',
    });
    expect(result.summary).toMatchInlineSnapshot(`"phone_number must be non-empty"`);
  });
});
