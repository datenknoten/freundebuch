import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';

/**
 * Collective types and validation schemas for Epic 12: Collectives
 *
 * Collectives are entities that group contacts together (families, companies, clubs)
 * with automatic relationship creation based on roles.
 */

// ============================================================================
// Input Schemas
// ============================================================================

/** Schema for creating a collective */
export const CollectiveInputSchema = type({
  name: 'string > 0',
  collective_type_id: 'string.uuid', // External ID of the collective type
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
  // Validate name length
  if (data.name.trim().length === 0) {
    ctx.mustBe('a collective with a non-empty name');
    return false;
  }
  if (data.name.length > 200) {
    ctx.mustBe('a collective with a name of 200 characters or less');
    return false;
  }
  return true;
});

export type CollectiveInput = typeof CollectiveInputSchema.infer;
