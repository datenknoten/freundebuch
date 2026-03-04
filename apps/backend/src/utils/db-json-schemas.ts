/**
 * Safe parsers for JSON/JSONB columns returned by PgTyped queries.
 * Each parser validates individual elements against ArkType schemas
 * and returns a typed value or a safe default ([] or null) when the
 * database value is malformed.
 */

import { type } from 'arktype';

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
 * Non-array values become `[]`. Elements that fail validation are
 * silently dropped — this keeps the rest of the data usable when a
 * single row has an unexpected shape.
 */
function safeArray<T>(value: unknown, schema: { assert: (data: unknown) => T }): T[] {
  if (!Array.isArray(value)) return [];
  const results: T[] = [];
  for (const element of value) {
    try {
      results.push(schema.assert(element));
    } catch {
      // Skip malformed element — DB constraints should prevent this,
      // but if it happens we keep the valid rows rather than failing entirely.
    }
  }
  return results;
}

export function parseCirclesJson(value: unknown): CircleJsonRow[] {
  return safeArray(value, CircleJsonRowSchema);
}

export function parsePhonesJson(value: unknown): PhoneJsonRow[] {
  return safeArray(value, PhoneJsonRowSchema);
}

export function parseEmailsJson(value: unknown): EmailJsonRow[] {
  return safeArray(value, EmailJsonRowSchema);
}

export function parseAddressesJson(value: unknown): AddressJsonRow[] {
  return safeArray(value, AddressJsonRowSchema);
}

export function parseUrlsJson(value: unknown): UrlJsonRow[] {
  return safeArray(value, UrlJsonRowSchema);
}

export function parseDatesJson(value: unknown): DateJsonRow[] {
  return safeArray(value, DateJsonRowSchema);
}

export function parseMetInfoJson(value: unknown): MetInfoJsonRow | null {
  try {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return MetInfoJsonRowSchema.assert(value);
    }
  } catch {
    // Malformed met_info object — return null rather than crashing
  }
  return null;
}

export function parseSocialProfilesJson(value: unknown): SocialProfileJsonRow[] {
  return safeArray(value, SocialProfileJsonRowSchema);
}

export function parseRelationshipsJson(value: unknown): RelationshipJsonRow[] {
  return safeArray(value, RelationshipJsonRowSchema);
}

export function parseProfessionalHistoryJson(value: unknown): ProfessionalHistoryJsonRow[] {
  return safeArray(value, ProfessionalHistoryJsonRowSchema);
}
