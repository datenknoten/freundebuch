import { type } from 'arktype';
import { CountryCodeSchema } from '../countries/country-code-schema.js';
import { CollectiveNameSchema } from './collective-name-schema.js';

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
export const CollectiveCreateInputSchema = type({
  name: CollectiveNameSchema,
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
});

export type CollectiveCreateInput = typeof CollectiveCreateInputSchema.infer;
