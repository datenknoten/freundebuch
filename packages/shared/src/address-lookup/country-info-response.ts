import { type } from 'arktype';

export const CountryInfoResponseSchema = type({
  /** ISO 3166-1 alpha-2 code (e.g. "DE") */
  code: 'string',
  /** Country name in the requested UI language */
  name: 'string',
});

export type CountryInfoResponse = typeof CountryInfoResponseSchema.infer;
