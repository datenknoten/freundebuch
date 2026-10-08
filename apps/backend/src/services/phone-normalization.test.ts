import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AppContext } from '../types/context.js';
import { PhoneCountryUnknownError } from '../utils/errors.js';
import { normalizePhoneBody } from './phone-normalization.js';

function contextWithLanguage(acceptLanguage?: string): Context<AppContext> {
  const fake = {
    req: { header: (name: string) => (name === 'Accept-Language' ? acceptLanguage : undefined) },
  };
  return fake as unknown as Context<AppContext>;
}

function normalize(
  storedCountry: string | null,
  phone: string,
  acceptLanguage?: string,
): Promise<Record<string, unknown>> {
  const run = normalizePhoneBody(async () => storedCountry);
  return run(contextWithLanguage(acceptLanguage), 'user-1', 'owner-1', { phone_number: phone });
}

describe('normalizePhoneBody', () => {
  it('reads a national number in the country of the stored ISO code', async () => {
    await expect(normalize('AT', '0664 1234567', 'de-DE')).resolves.toEqual({
      phone_number: '+436641234567',
    });
  });

  it('maps a legacy country name on the primary address to its code', async () => {
    await expect(normalize('Deutschland', '030 12345678')).resolves.toEqual({
      phone_number: '+493012345678',
    });
  });

  it('falls back to Accept-Language when the stored country is unknown text', async () => {
    await expect(normalize('Atlantis', '030 12345678', 'de-DE,de;q=0.9')).resolves.toEqual({
      phone_number: '+493012345678',
    });
  });

  it('falls back to Accept-Language when the owner has no primary address', async () => {
    await expect(normalize(null, '0664 1234567', 'de-AT')).resolves.toEqual({
      phone_number: '+436641234567',
    });
  });

  it('rejects a national number when no country can be guessed', async () => {
    await expect(normalize(null, '030 12345678')).rejects.toBeInstanceOf(PhoneCountryUnknownError);
  });

  it('keeps a number that is already in E.164 format', async () => {
    await expect(normalize(null, '+493012345678')).resolves.toEqual({
      phone_number: '+493012345678',
    });
  });
});
