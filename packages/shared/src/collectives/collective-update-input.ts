import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';
import { CollectiveNameSchema } from './collective-name-schema.js';

export const CollectiveUpdateInputSchema = type({
  'name?': CollectiveNameSchema,
  'notes?': 'string | null',
  'photo_url?': 'string | null',
  'photo_thumbnail_url?': 'string | null',
  'address_street_line1?': 'string | null',
  'address_street_line2?': 'string | null',
  'address_city?': 'string | null',
  'address_state_province?': 'string | null',
  'address_postal_code?': 'string | null',
  'address_country?': CountryCodeSchema.or('null'),
});

export type CollectiveUpdateInput = typeof CollectiveUpdateInputSchema.infer;
