import { type Traversal, type } from 'arktype';
import { isCountryCode } from './country-code.js';

function checkCountryCode(value: string, ctx: Traversal) {
  if (isCountryCode(value) === true) {
    return true;
  }
  return ctx.mustBe('an ISO 3166-1 alpha-2 country code');
}

/** ISO 3166-1 alpha-2 country code as stored on addresses (e.g. "DE"). */
export const CountryCodeSchema = type('string').narrow(checkCountryCode);
