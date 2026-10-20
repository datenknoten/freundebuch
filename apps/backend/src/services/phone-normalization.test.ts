import { describe, expect, it } from 'vitest';
import { PhoneCountryUnknownError } from '../errors/phone-country-unknown.error.js';
import { normalizePhoneBody } from './phone-normalization.js';

function normalize(
  storedCountry: string | null,
  phone: string,
  acceptLanguage?: string,
): Promise<Record<string, unknown>> {
  const run = normalizePhoneBody(async () => storedCountry);
  return run('user-1', 'owner-1', { phone_number: phone }, acceptLanguage);
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
