/**
 * Safe parsers for JSON/JSONB columns returned by PgTyped queries.
 * Each parser validates individual elements against ArkType schemas
 * and returns a typed value or a safe default ([] or null) when the
 * database value is malformed.
 */

import { type } from 'arktype';
import type { Logger } from 'pino';

// ============================================================================
// ArkType Schemas (matching the JSON aggregates produced by SQL queries)
// ============================================================================

const CircleJsonRowSchema = type({
  external_id: 'string',
  name: 'string',
  color: 'string | null',
});

const PhoneJsonRowSchema = type({
  external_id: 'string',
  phone_number: 'string',
  phone_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  created_at: 'string',
});

const EmailJsonRowSchema = type({
  external_id: 'string',
  email_address: 'string',
  email_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  created_at: 'string',
});

const AddressJsonRowSchema = type({
  external_id: 'string',
  street_line1: 'string | null',
  street_line2: 'string | null',
  city: 'string | null',
  state_province: 'string | null',
  postal_code: 'string | null',
  country: 'string | null',
  address_type: 'string',
  label: 'string | null',
  is_primary: 'boolean',
  latitude: 'number | null',
  longitude: 'number | null',
  created_at: 'string',
});

const UrlJsonRowSchema = type({
  external_id: 'string',
  url: 'string',
  url_type: 'string',
  label: 'string | null',
  created_at: 'string',
});

const DateJsonRowSchema = type({
  external_id: 'string',
  date_value: 'string',
  year_known: 'boolean',
  date_type: 'string',
  label: 'string | null',
  created_at: 'string',
});

const MetInfoJsonRowSchema = type({
  external_id: 'string',
  met_date: 'string | null',
  met_location: 'string | null',
  met_context: 'string | null',
  created_at: 'string',
  updated_at: 'string',
});

const SocialProfileJsonRowSchema = type({
  external_id: 'string',
  platform: 'string',
  profile_url: 'string | null',
  username: 'string | null',
  created_at: 'string',
});

const RelationshipJsonRowSchema = type({
  external_id: 'string',
  related_friend_external_id: 'string',
  related_friend_display_name: 'string',
  related_friend_photo_thumbnail_url: 'string | null',
  relationship_type_id: 'string',
  relationship_type_label: 'string',
  relationship_category: 'string',
  notes: 'string | null',
  created_at: 'string',
});

const ProfessionalHistoryJsonRowSchema = type({
  external_id: 'string',
  job_title: 'string | null',
  organization: 'string | null',
  department: 'string | null',
  notes: 'string | null',
  from_month: 'number',
  from_year: 'number',
  to_month: 'number | null',
  to_year: 'number | null',
  is_primary: 'boolean',
  created_at: 'string',
});

// ============================================================================
// Inferred Types (exported for use by callers)
// ============================================================================

export type CircleJsonRow = typeof CircleJsonRowSchema.infer;
export type PhoneJsonRow = typeof PhoneJsonRowSchema.infer;
export type EmailJsonRow = typeof EmailJsonRowSchema.infer;
export type AddressJsonRow = typeof AddressJsonRowSchema.infer;
export type UrlJsonRow = typeof UrlJsonRowSchema.infer;
export type DateJsonRow = typeof DateJsonRowSchema.infer;
export type MetInfoJsonRow = typeof MetInfoJsonRowSchema.infer;
export type SocialProfileJsonRow = typeof SocialProfileJsonRowSchema.infer;
export type RelationshipJsonRow = typeof RelationshipJsonRowSchema.infer;
export type ProfessionalHistoryJsonRow = typeof ProfessionalHistoryJsonRowSchema.infer;

// ============================================================================
// Safe Parsers
// ============================================================================

/**
 * Validates each element of an array against an ArkType schema.
 *
 * Non-array values become `[]`, and elements that fail validation are dropped
 * so one bad row does not blank the whole friend. Dropping used to be silent,
 * which made a schema/column mismatch look like missing data to the user and
 * left no trace anywhere; every drop is now logged with the resource and index.
 */
function safeArray<T>(
  value: unknown,
  schema: { assert: (data: unknown) => T },
  logger: Logger,
  resource: string,
): T[] {
  if (!Array.isArray(value)) return [];
  const results: T[] = [];
  for (const [index, element] of value.entries()) {
    try {
      results.push(schema.assert(element));
    } catch (error) {
      logger.warn(
        { resource, index, reason: error instanceof Error ? error.message : String(error) },
        'Dropped malformed JSON aggregate element',
      );
    }
  }
  return results;
}

export function parseCirclesJson(value: unknown, logger: Logger): CircleJsonRow[] {
  return safeArray(value, CircleJsonRowSchema, logger, 'circles');
}

export function parsePhonesJson(value: unknown, logger: Logger): PhoneJsonRow[] {
  return safeArray(value, PhoneJsonRowSchema, logger, 'phones');
}

export function parseEmailsJson(value: unknown, logger: Logger): EmailJsonRow[] {
  return safeArray(value, EmailJsonRowSchema, logger, 'emails');
}

export function parseAddressesJson(value: unknown, logger: Logger): AddressJsonRow[] {
  return safeArray(value, AddressJsonRowSchema, logger, 'addresses');
}

export function parseUrlsJson(value: unknown, logger: Logger): UrlJsonRow[] {
  return safeArray(value, UrlJsonRowSchema, logger, 'urls');
}

export function parseDatesJson(value: unknown, logger: Logger): DateJsonRow[] {
  return safeArray(value, DateJsonRowSchema, logger, 'dates');
}

export function parseMetInfoJson(value: unknown, logger: Logger): MetInfoJsonRow | null {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return MetInfoJsonRowSchema.assert(value);
    }
  } catch (error) {
    logger.warn(
      { resource: 'metInfo', reason: error instanceof Error ? error.message : String(error) },
      'Dropped malformed JSON aggregate element',
    );
  }
  return null;
}

export function parseSocialProfilesJson(value: unknown, logger: Logger): SocialProfileJsonRow[] {
  return safeArray(value, SocialProfileJsonRowSchema, logger, 'socialProfiles');
}

export function parseRelationshipsJson(value: unknown, logger: Logger): RelationshipJsonRow[] {
  return safeArray(value, RelationshipJsonRowSchema, logger, 'relationships');
}

export function parseProfessionalHistoryJson(
  value: unknown,
  logger: Logger,
): ProfessionalHistoryJsonRow[] {
  return safeArray(value, ProfessionalHistoryJsonRowSchema, logger, 'professionalHistory');
}
