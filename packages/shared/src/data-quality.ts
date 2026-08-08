import { type } from 'arktype';

/**
 * Data-quality suggestions: field catalog, scoring inputs and API DTOs.
 *
 * The catalog is a versioned TypeScript constant rather than a database table,
 * so weights, costs and TTLs are tunable without a migration. The database
 * stores only provenance keyed by an opaque `field_key`.
 */

// ============================================================================
// Field catalog
// ============================================================================

export const DqFieldKeySchema = type(
  '"birthday" | "phone_mobile" | "address_postal" | "relationship_context" | "email" | "family" | "social_profile" | "employer_role" | "photo"',
);
export type DqFieldKey = typeof DqFieldKeySchema.infer;

/** How the dashboard's "Ergänzen" action reaches the right add-form on the friend detail page. */
export type DqAddTarget =
  | 'date'
  | 'phone'
  | 'address'
  | 'email'
  | 'relationship'
  | 'social'
  | 'professional'
  | null;

export interface DqFieldDefinition {
  key: DqFieldKey;
  /** Scoring weight w_f. */
  weight: number;
  /** Effort cost_f; damped as cost^0.6. */
  cost: number;
  /** Days after which a present value counts as unverified. null = never expires. */
  ttlDays: number | null;
  /** i18n key for the German/English field label. */
  i18nKey: string;
  /** `?add=<target>` value for the friend detail deep link; null = plain link to the friend. */
  addTarget: DqAddTarget;
}

export const DQ_FIELD_CATALOG: readonly DqFieldDefinition[] = [
  {
    key: 'birthday',
    weight: 10,
    cost: 2,
    ttlDays: null,
    i18nKey: 'dataQuality.fields.birthday',
    addTarget: 'date',
  },
  {
    key: 'phone_mobile',
    weight: 8,
    cost: 1,
    ttlDays: 1095,
    i18nKey: 'dataQuality.fields.phoneMobile',
    addTarget: 'phone',
  },
  {
    key: 'address_postal',
    weight: 7,
    cost: 3,
    ttlDays: 730,
    i18nKey: 'dataQuality.fields.addressPostal',
    addTarget: 'address',
  },
  {
    key: 'relationship_context',
    weight: 6,
    cost: 2,
    ttlDays: null,
    i18nKey: 'dataQuality.fields.relationshipContext',
    addTarget: null,
  },
  {
    key: 'email',
    weight: 5,
    cost: 1,
    ttlDays: 1095,
    i18nKey: 'dataQuality.fields.email',
    addTarget: 'email',
  },
  {
    key: 'family',
    weight: 5,
    cost: 3,
    ttlDays: 365,
    i18nKey: 'dataQuality.fields.family',
    addTarget: 'relationship',
  },
  {
    key: 'social_profile',
    weight: 3,
    cost: 1,
    ttlDays: 730,
    i18nKey: 'dataQuality.fields.socialProfile',
    addTarget: 'social',
  },
  {
    key: 'employer_role',
    weight: 3,
    cost: 2,
    ttlDays: 365,
    i18nKey: 'dataQuality.fields.employerRole',
    addTarget: 'professional',
  },
  {
    key: 'photo',
    weight: 2,
    cost: 2,
    ttlDays: null,
    i18nKey: 'dataQuality.fields.photo',
    addTarget: null,
  },
] as const;

/** Tier 1–4 → closeness multiplier. Index 0 is tier 1. */
export const DQ_CLOSENESS_BY_TIER = [1.0, 0.7, 0.45, 0.25] as const;

// ============================================================================
// Response DTOs
// ============================================================================

export type DqReason =
  | { kind: 'birthday_soon'; days: number }
  | { kind: 'recent_encounter'; days: number }
  | { kind: 'new_friend'; days: number }
  | { kind: 'upcoming_encounter'; days: number };

export interface DqSuggestionItem {
  /** friends.friends.external_id */
  friendId: string;
  friendDisplayName: string;
  photoThumbnailUrl?: string;
  fieldKey: DqFieldKey;
  /** itemScore, rounded to 4 decimals */
  score: number;
  /** rounded to 4 decimals */
  gap: number;
  /** true = a value exists but its TTL lapsed; false = the field is empty. */
  isStale: boolean;
  /** Whole days since verified_at; only set when isStale is true. */
  staleDays?: number;
  reasons: DqReason[];
}

export interface DqWorthwhileEntry {
  friendId: string;
  friendDisplayName: string;
  photoThumbnailUrl?: string;
  /** contactScore */
  score: number;
  /** the top 3 that produced the score */
  items: DqSuggestionItem[];
}

export interface DqSuggestionsResponse {
  quickWins: DqSuggestionItem[];
  worthwhile: DqWorthwhileEntry[];
}

export interface DqIndexPoint {
  /** YYYY-MM-DD */
  date: string;
  /** 0..1 */
  value: number;
}

export interface DqIndexResponse {
  current: number;
  history: DqIndexPoint[];
}

export interface DqFriendFieldState {
  fieldKey: DqFieldKey;
  isPresent: boolean;
  isNotApplicable: boolean;
  /** ISO instant */
  verifiedAt?: string;
  isStale: boolean;
  isSnoozed: boolean;
}

export interface DqFriendFieldsResponse {
  friendId: string;
  fields: DqFriendFieldState[];
}

// ============================================================================
// Request schemas
// ============================================================================

export const DqSnoozeInputSchema = type({
  friendId: 'string.uuid',
  'fieldKey?': DqFieldKeySchema,
  days: '1 <= number.integer <= 3650',
  reason: '"later" | "wont_ask" | "no_source"',
});
export type DqSnoozeInput = typeof DqSnoozeInputSchema.infer;

export const DqNotApplicableInputSchema = type({
  friendId: 'string.uuid',
  fieldKey: DqFieldKeySchema,
  value: 'boolean',
});
export type DqNotApplicableInput = typeof DqNotApplicableInputSchema.infer;
