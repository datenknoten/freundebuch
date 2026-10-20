import { countries } from './registered-countries.js';

const ALPHA2 = /^[A-Z]{2}$/;

/** True when `value` is an ISO 3166-1 alpha-2 code known to i18n-iso-countries. */
export function isCountryCode(value: string) {
  return ALPHA2.test(value) === true && countries.isValid(value) === true;
}
