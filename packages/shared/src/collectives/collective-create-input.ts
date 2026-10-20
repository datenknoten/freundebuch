import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';
import { CollectiveNameSchema } from './collective-name-schema.js';

/**
 * Collectives group contacts (families, companies, clubs) and create
 * relationships between members automatically based on their roles.
 */
export const CollectiveCreateInputSchema = type({
  name: CollectiveNameSchema,
  collective_type_id: 'string.uuid',
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

export type CollectiveCreateInput = typeof CollectiveCreateInputSchema.infer;
