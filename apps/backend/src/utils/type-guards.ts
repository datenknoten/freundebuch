import {
  type AddressType,
  AddressTypeSchema,
  type DateType,
  DateTypeSchema,
  type EmailType,
  EmailTypeSchema,
  type PhoneType,
  PhoneTypeSchema,
  type RelationshipCategory,
  RelationshipCategorySchema,
  type RelationshipTypeId,
  RelationshipTypeIdSchema,
  type SocialPlatform,
  SocialPlatformSchema,
  type UrlType,
  UrlTypeSchema,
  type UserPreferences,
  UserPreferencesSchema,
} from '@freundebuch/shared/index.js';
import { type } from 'arktype';
import type { RateLimiterRes } from 'rate-limiter-flexible';
import type { Json } from '../models/queries/users.queries.js';

// ============================================================================
// Type Guards
// ============================================================================

/** Checks whether an unknown error is a Node.js ErrnoException */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

/** Checks whether an unknown error is a RateLimiterRes rejection */
export function isRateLimiterRes(error: unknown): error is RateLimiterRes {
  return (
    typeof error === 'object' &&
    error !== null &&
    'msBeforeNext' in error &&
    typeof (error as RateLimiterRes).msBeforeNext === 'number'
  );
}

/** Checks whether an unknown value is a plain key-value object */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================================================
// Enum Parsers (backed by ArkType schemas from @freundebuch/shared)
// ============================================================================

function makeEnumParser<T>(schema: { assert: (data: unknown) => T }, label: string) {
  return (value: string): T => {
    try {
      return schema.assert(value);
    } catch {
      throw new TypeError(`Invalid ${label}: ${value}`);
    }
  };
}

export const parsePhoneType = makeEnumParser<PhoneType>(PhoneTypeSchema, 'PhoneType');
export const parseEmailType = makeEnumParser<EmailType>(EmailTypeSchema, 'EmailType');
export const parseAddressType = makeEnumParser<AddressType>(AddressTypeSchema, 'AddressType');
export const parseUrlType = makeEnumParser<UrlType>(UrlTypeSchema, 'UrlType');
export const parseDateType = makeEnumParser<DateType>(DateTypeSchema, 'DateType');
export const parseSocialPlatform = makeEnumParser<SocialPlatform>(
  SocialPlatformSchema,
  'SocialPlatform',
);
export const parseRelationshipCategory = makeEnumParser<RelationshipCategory>(
  RelationshipCategorySchema,
  'RelationshipCategory',
);
export const parseRelationshipTypeId = makeEnumParser<RelationshipTypeId>(
  RelationshipTypeIdSchema,
  'RelationshipTypeId',
);

// ============================================================================
// Domain Parsers
// ============================================================================

const MatchSourceSchema = type("'friend' | 'email' | 'phone' | 'notes'");

export function parseMatchSource(
  value: string | null,
): 'friend' | 'email' | 'phone' | 'notes' | null {
  if (value === null) return null;
  try {
    return MatchSourceSchema.assert(value);
  } catch {
    return null;
  }
}

const RelationshipDirectionSchema = type("'new_member' | 'existing_member' | 'both'");

export function parseRelationshipDirection(
  value: string,
): 'new_member' | 'existing_member' | 'both' {
  return RelationshipDirectionSchema.assert(value);
}

export function parseUserPreferences(value: unknown): UserPreferences {
  return UserPreferencesSchema.assert(value);
}

/** Safe conversion of an object to the PgTyped Json type */
export function toJson(value: object): Json {
  // JSON.parse(JSON.stringify(...)) round-trips through JSON serialization,
  // which strips undefined values and class instances, producing a plain Json value.
  return JSON.parse(JSON.stringify(value)) as Json;
}
