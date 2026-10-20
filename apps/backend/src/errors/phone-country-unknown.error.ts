import { ValidationError } from '@datenknoten/kit';

/**
 * A national-format number (no leading "+") whose country cannot be derived, so it
 * cannot be normalized to E.164. The frontend keys its guidance on the code.
 */
export class PhoneCountryUnknownError extends ValidationError {
  public override readonly code = 'PHONE_COUNTRY_UNKNOWN';

  constructor() {
    super(
      'Could not determine the country for this phone number. Enter it in international format (e.g. +49 6709 426) or add an address to detect the country.',
    );
  }
}
