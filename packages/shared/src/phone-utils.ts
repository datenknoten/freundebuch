import { type CountryCode, parsePhoneNumber } from 'libphonenumber-js';

/**
 * Normalize a phone number to E.164 format using a default country code.
 * If the number already starts with '+', it's returned as-is.
 * If no default country is provided or parsing fails, the original string is returned
 * so that schema validation can handle the error.
 */
export function normalizePhoneNumber(phone: string, defaultCountry?: string): string {
  if (phone.startsWith('+')) return phone;
  if (!defaultCountry) return phone;

  try {
    const parsed = parsePhoneNumber(phone, defaultCountry as CountryCode);
    if (parsed.isValid()) {
      return parsed.format('E.164');
    }
  } catch {
    // Fall through — return original, let schema validation handle the error
  }
  return phone;
}
