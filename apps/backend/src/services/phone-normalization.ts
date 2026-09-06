import { normalizePhoneNumber } from '@freundebuch/shared/index.js';
import type { Context } from 'hono';
import type { AppContext } from '../types/context.js';
import { countryNameToCode, localeToCountry } from '../utils/country.js';
import { PhoneCountryUnknownError } from '../utils/errors.js';

/**
 * Resolves the country to interpret a national-format number in, given the
 * owner (friend or collective) the phone belongs to. Returns a country *name*
 * as stored on the owner's primary address, or null/undefined when unknown.
 */
export type PrimaryCountryLookup = (
  c: Context<AppContext>,
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
  return async (
    c: Context<AppContext>,
    userId: string,
    ownerId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    if (typeof body.phone_number !== 'string' || body.phone_number.startsWith('+')) {
      return body;
    }

    const countryName = await primaryCountry(c, userId, ownerId);
    const countryCode =
      (countryName == null ? undefined : countryNameToCode(countryName)) ??
      localeToCountry(c.req.header('Accept-Language'));

    const normalized = normalizePhoneNumber(body.phone_number, countryCode);
    // Still not E.164: no usable address, ambiguous locale, or the number is
    // invalid for the guessed country.
    if (!normalized.startsWith('+')) {
      throw new PhoneCountryUnknownError();
    }

    return { ...body, phone_number: normalized };
  };
}
