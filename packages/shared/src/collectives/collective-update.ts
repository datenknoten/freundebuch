import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';

/** Schema for updating a collective (all fields optional) */
export const CollectiveUpdateSchema = type({
  'name?': 'string > 0',
  'notes?': 'string | null',
  'photo_url?': 'string | null',
  'photo_thumbnail_url?': 'string | null',
  'address_street_line1?': 'string | null',
  'address_street_line2?': 'string | null',
  'address_city?': 'string | null',
  'address_state_province?': 'string | null',
  'address_postal_code?': 'string | null',
  'address_country?': CountryCodeSchema.or('null'),
}).narrow((data, ctx) => {
  // Validate name length if provided
  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      ctx.mustBe('a collective with a non-empty name');
      return false;
    }
    if (data.name.length > 200) {
      ctx.mustBe('a collective with a name of 200 characters or less');
      return false;
    }
  }
  return true;
});

export type CollectiveUpdate = typeof CollectiveUpdateSchema.infer;
