import { countryNameToCode, normalizePhoneNumber } from '@freundebuch/shared/index.js';
import { PhoneCountryUnknownError } from '../errors/phone-country-unknown.error.js';
import { localeToCountry } from '../utils/country.js';

/**
 * Resolves the country to interpret a national-format number in, given the
 * owner (friend or collective) the phone belongs to. Returns the country stored
 * on the owner's primary address (an ISO code; legacy rows may hold free text),
 * or null/undefined when unknown.
 */
export type PrimaryCountryLookup = (
  userId: string,
  ownerId: string,
) => Promise<string | null | undefined>;

/**
 * Normalise `phone_number` to E.164 before schema validation.
 *
 * Clients send what the user typed, which is usually national format. The
 * country is guessed from the owner's primary address, falling back to the
 * Accept-Language header. Four hand-written copies of this lived in the phone
 * route files (friend and collective, create and update).
 */
export function normalizePhoneBody(primaryCountry: PrimaryCountryLookup) {
  return async function normalize(
    userId: string,
    ownerId: string,
    body: Record<string, unknown>,
    acceptLanguage: string | undefined,
  ): Promise<Record<string, unknown>> {
    if (typeof body.phone_number !== 'string' || body.phone_number.startsWith('+')) {
      return body;
    }

    const countryName = await primaryCountry(userId, ownerId);
    const countryCode =
      (countryName == null ? undefined : countryNameToCode(countryName)) ??
      localeToCountry(acceptLanguage);

    const normalized = normalizePhoneNumber(body.phone_number, countryCode);
    // Still not E.164: no usable address, ambiguous locale, or the number is
    // invalid for the guessed country.
    if (!normalized.startsWith('+')) {
      throw new PhoneCountryUnknownError();
    }

    return { ...body, phone_number: normalized };
  };
}
