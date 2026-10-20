import { type } from 'arktype';
import { isCountryCode } from './country-code.js';

/** ISO 3166-1 alpha-2 country code as stored on addresses (e.g. "DE"). */
export const CountryCodeSchema = type('string').narrow(
  (value, ctx) => isCountryCode(value) || ctx.mustBe('an ISO 3166-1 alpha-2 country code'),
);
