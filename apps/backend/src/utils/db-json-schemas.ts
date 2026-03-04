/**
 * Safe parsers for JSON/JSONB columns returned by PgTyped queries.
 * Each parser returns a typed value or a safe default ([] or null)
 * when the database value is malformed.
 */

// ============================================================================
// Row shape interfaces (matching the JSON aggregates produced by SQL queries)
// ============================================================================

export interface CircleJsonRow {
  external_id: string;
  name: string;
  color: string | null;
}

export interface PhoneJsonRow {
  external_id: string;
  phone_number: string;
  phone_type: string;
  label: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface EmailJsonRow {
  external_id: string;
  email_address: string;
  email_type: string;
  label: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface AddressJsonRow {
  external_id: string;
  street_line1: string | null;
  street_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  address_type: string;
  label: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface UrlJsonRow {
  external_id: string;
  url: string;
  url_type: string;
  label: string | null;
  created_at: string;
}

export interface DateJsonRow {
  external_id: string;
  date_value: string;
  year_known: boolean;
  date_type: string;
  label: string | null;
  created_at: string;
}

export interface MetInfoJsonRow {
  external_id: string;
  met_date: string | null;
  met_location: string | null;
  met_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialProfileJsonRow {
  external_id: string;
  platform: string;
  profile_url: string | null;
  username: string | null;
  created_at: string;
}

export interface RelationshipJsonRow {
  external_id: string;
  related_friend_external_id: string;
  related_friend_display_name: string;
  related_friend_photo_thumbnail_url: string | null;
  relationship_type_id: string;
  relationship_type_label: string;
  relationship_category: string;
  notes: string | null;
  created_at: string;
}

export interface ProfessionalHistoryJsonRow {
  external_id: string;
  job_title: string | null;
  organization: string | null;
  department: string | null;
  notes: string | null;
  from_month: number;
  from_year: number;
  to_month: number | null;
  to_year: number | null;
  is_primary: boolean;
  created_at: string;
}

// ============================================================================
// Safe Parsers
// ============================================================================

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseCirclesJson(value: unknown): CircleJsonRow[] {
  return safeArray<CircleJsonRow>(value);
}

export function parsePhonesJson(value: unknown): PhoneJsonRow[] {
  return safeArray<PhoneJsonRow>(value);
}

export function parseEmailsJson(value: unknown): EmailJsonRow[] {
  return safeArray<EmailJsonRow>(value);
}

export function parseAddressesJson(value: unknown): AddressJsonRow[] {
  return safeArray<AddressJsonRow>(value);
}

export function parseUrlsJson(value: unknown): UrlJsonRow[] {
  return safeArray<UrlJsonRow>(value);
}

export function parseDatesJson(value: unknown): DateJsonRow[] {
  return safeArray<DateJsonRow>(value);
}

export function parseMetInfoJson(value: unknown): MetInfoJsonRow | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as MetInfoJsonRow;
  }
  return null;
}

export function parseSocialProfilesJson(value: unknown): SocialProfileJsonRow[] {
  return safeArray<SocialProfileJsonRow>(value);
}

export function parseRelationshipsJson(value: unknown): RelationshipJsonRow[] {
  return safeArray<RelationshipJsonRow>(value);
}

export function parseProfessionalHistoryJson(value: unknown): ProfessionalHistoryJsonRow[] {
  return safeArray<ProfessionalHistoryJsonRow>(value);
}
