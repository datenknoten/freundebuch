import { isSupportedCountry, parsePhoneNumber } from 'libphonenumber-js';

/**
 * Normalize a phone number to E.164 using a default country.
 * A number starting with '+' is returned as-is. Without a supported default
 * country, or when parsing fails, the original string is returned so that
 * schema validation reports the error.
 */
export function normalizePhoneNumber(phone: string, defaultCountry?: string) {
  if (phone.startsWith('+') === true) {
    return phone;
  }
  if (defaultCountry === undefined || isSupportedCountry(defaultCountry) === false) {
    return phone;
  }

  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (parsed.isValid() === true) {
      return parsed.format('E.164');
    }
  } catch {
    // Unparseable input falls through so schema validation reports it.
  }
  return phone;
}
