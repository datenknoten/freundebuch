import {
  DQ_CLOSENESS_BY_TIER,
  type DqFieldDefinition,
  type DqFieldKey,
  type DqReason,
} from '@freundebuch/shared/index.js';

/**
 * Pure scoring for data-quality suggestions.
 *
 * Nothing in here touches the database or the clock: every time-dependent input
 * arrives through `DqScoreContext`, and the weights are injected via
 * `ctx.catalog` rather than imported, so the whole module is trivially testable.
 */

const MILLISECONDS_PER_DAY = 86_400_000;

/** Effort damping exponent: cost^COST_EXPONENT. */
const COST_EXPONENT = 0.6;

/** Number of top item scores that make up a contact score. */
const CONTACT_SCORE_ITEM_COUNT = 3;

/** A birthday this close makes card- and gift-relevant fields urgent. */
const BIRTHDAY_HORIZON_DAYS = 45;

/** Fields worth completing before a birthday. */
const BIRTHDAY_RELEVANT_FIELDS: Partial<Record<DqFieldKey, true>> = {
  address_postal: true,
  phone_mobile: true,
  family: true,
};

/** An encounter this recent means the details are still fresh in mind. */
const RECENT_ENCOUNTER_DAYS = 14;

/** A friend added this recently is still being filled in. */
const NEW_FRIEND_DAYS = 30;

const BIRTHDAY_BOOST = 0.8;
const RECENT_ENCOUNTER_BOOST = 0.5;
const NEW_FRIEND_BOOST = 0.7;
const UPCOMING_ENCOUNTER_BOOST = 0.6;

export interface DqFieldStateInput {
  fieldKey: DqFieldKey;
  isPresent: boolean;
  isNotApplicable: boolean;
  verifiedAt: Date | null;
}

export interface DqFriendInput {
  /** external_id */
  friendId: string;
  displayName: string;
  photoThumbnailUrl: string | null;
  /** Resolved tier 1–4. */
  tier: number;
  /** Days until the next birthday anniversary; null when no birthday is known. */
  daysUntilBirthday: number | null;
  /** Whole days since the most recent encounter that is not in the future; null when none. */
  daysSinceLastEncounter: number | null;
  /** Days until the next future-dated encounter; null when none. */
  daysUntilNextEncounter: number | null;
  /** Whole days since friends.friends.created_at. */
  friendAgeInDays: number;
  fields: DqFieldStateInput[];
}

export interface DqSnoozeState {
  /** Set when the whole friend is snoozed and the snooze is still active. */
  friendSnoozed: boolean;
  /** Field keys with an active snooze. */
  snoozedFields: ReadonlySet<DqFieldKey>;
}

export interface DqScoreContext {
  now: Date;
  /** Local calendar day, YYYY-MM-DD. Only used for the tie-break hash. */
  today: string;
  catalog: readonly DqFieldDefinition[];
  snoozesByFriendId: ReadonlyMap<string, DqSnoozeState>;
}

export interface DqItemScore {
  friendId: string;
  fieldKey: DqFieldKey;
  definition: DqFieldDefinition;
  gap: number;
  closeness: number;
  urgency: number;
  score: number;
  isStale: boolean;
  staleDays?: number;
  reasons: DqReason[];
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * No tier/closeness column exists in the schema. Tier is derived from circle
 * membership: the seeded default circles are ordered Family(0), Friends(1),
 * Work(2), Acquaintances(3), so `sort_order` already expresses closeness.
 * A favourite is always tier 1.
 */
export function resolveTier(isFavorite: boolean, minCircleSortOrder: number | null): number {
  if (isFavorite) {
    return 1;
  }
  if (minCircleSortOrder === null) {
    return 4;
  }
  return clamp(minCircleSortOrder + 1, 1, 4);
}

/**
 * FNV-1a 32-bit over `${friendId}|${fieldKey ?? ''}|${today}`.
 *
 * Deterministic within a day and rotating across days, so equal scores do not
 * always favour the same friend.
 */
export function dqTieBreak(friendId: string, fieldKey: DqFieldKey | null, today: string): number {
  const input = `${friendId}|${fieldKey ?? ''}|${today}`;

  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in uint32 range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}

/** Whole days between `verifiedAt` and `now`. */
function ageInDays(now: Date, verifiedAt: Date): number {
  return Math.floor((now.getTime() - verifiedAt.getTime()) / MILLISECONDS_PER_DAY);
}

/**
 * How badly a field needs attention: 0 = fine, 1 = missing or twice past its TTL.
 *
 * A present value with no recorded provenance scores 0 rather than 1: provenance
 * we never recorded is not evidence of staleness, and the product rule is
 * "no nagging".
 */
function computeGap(
  state: DqFieldStateInput,
  definition: DqFieldDefinition,
  now: Date,
): { gap: number; ageDays: number | null } {
  if (!state.isPresent) {
    return { gap: 1, ageDays: null };
  }
  if (definition.ttlDays === null || state.verifiedAt === null) {
    return { gap: 0, ageDays: null };
  }

  const ageDays = ageInDays(now, state.verifiedAt);
  const gap = clamp((ageDays - definition.ttlDays) / definition.ttlDays, 0, 1);

  return { gap, ageDays };
}

/** Urgency multiplier plus the reasons that produced it. Each boost fires at most once. */
function computeUrgency(
  friend: DqFriendInput,
  fieldKey: DqFieldKey,
): { urgency: number; reasons: DqReason[] } {
  let urgency = 1;
  const reasons: DqReason[] = [];

  if (
    friend.daysUntilBirthday !== null &&
    friend.daysUntilBirthday <= BIRTHDAY_HORIZON_DAYS &&
    BIRTHDAY_RELEVANT_FIELDS[fieldKey] === true
  ) {
    urgency += BIRTHDAY_BOOST;
    reasons.push({ kind: 'birthday_soon', days: friend.daysUntilBirthday });
  }

  if (
    friend.daysSinceLastEncounter !== null &&
    friend.daysSinceLastEncounter <= RECENT_ENCOUNTER_DAYS
  ) {
    urgency += RECENT_ENCOUNTER_BOOST;
    reasons.push({ kind: 'recent_encounter', days: friend.daysSinceLastEncounter });
  }

  if (friend.friendAgeInDays < NEW_FRIEND_DAYS) {
    urgency += NEW_FRIEND_BOOST;
    reasons.push({ kind: 'new_friend', days: friend.friendAgeInDays });
  }

  if (friend.daysUntilNextEncounter !== null) {
    urgency += UPCOMING_ENCOUNTER_BOOST;
    reasons.push({ kind: 'upcoming_encounter', days: friend.daysUntilNextEncounter });
  }

  return { urgency, reasons };
}

/**
 * Score every applicable field of one friend.
 *
 * Items with `gap === 0` are still emitted; callers filter on `score > 0` before
 * bucketing. An active whole-friend snooze yields an empty list, which is what
 * drops the friend out of both buckets.
 */
export function scoreItems(friend: DqFriendInput, ctx: DqScoreContext): DqItemScore[] {
  const snoozes = ctx.snoozesByFriendId.get(friend.friendId);

  if (snoozes?.friendSnoozed === true) {
    return [];
  }

  const stateByKey = new Map(friend.fields.map((field) => [field.fieldKey, field]));
  const closeness = DQ_CLOSENESS_BY_TIER[clamp(friend.tier, 1, 4) - 1] ?? 0;
  const items: DqItemScore[] = [];

  // The catalog drives the loop, so a field with no state row is treated as empty.
  for (const definition of ctx.catalog) {
    const state = stateByKey.get(definition.key) ?? {
      fieldKey: definition.key,
      isPresent: false,
      isNotApplicable: false,
      verifiedAt: null,
    };

    if (state.isNotApplicable || snoozes?.snoozedFields.has(definition.key) === true) {
      continue;
    }

    const { gap, ageDays } = computeGap(state, definition, ctx.now);
    const { urgency, reasons } = computeUrgency(friend, definition.key);
    const score =
      (definition.weight * gap * closeness * urgency) / definition.cost ** COST_EXPONENT;
    const isStale = state.isPresent && gap > 0;

    items.push({
      friendId: friend.friendId,
      fieldKey: definition.key,
      definition,
      gap,
      closeness,
      urgency,
      score,
      isStale,
      ...(isStale && ageDays !== null ? { staleDays: ageDays } : {}),
      reasons,
    });
  }

  return items;
}

/**
 * Sum of the three highest item scores.
 *
 * Top-3 rather than the total keeps a near-empty contact with twenty open side
 * fields from dominating the list.
 */
export function scoreContact(items: DqItemScore[]): number {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, CONTACT_SCORE_ITEM_COUNT)
    .reduce((sum, item) => sum + item.score, 0);
}

/**
 * 1 − Σ(w · closeness · gap) / Σ(w · closeness) over every applicable
 * (friend, field) pair.
 *
 * Snoozes are ignored: a snoozed gap is still a gap. Not-applicable fields are
 * excluded from both sums. Returns 1 when the denominator is 0.
 */
export function computeDqIndex(
  friends: readonly DqFriendInput[],
  catalog: readonly DqFieldDefinition[],
): number {
  let weightedGap = 0;
  let totalWeight = 0;

  for (const friend of friends) {
    const stateByKey = new Map(friend.fields.map((field) => [field.fieldKey, field]));
    const closeness = DQ_CLOSENESS_BY_TIER[clamp(friend.tier, 1, 4) - 1] ?? 0;

    for (const definition of catalog) {
      const state = stateByKey.get(definition.key) ?? {
        fieldKey: definition.key,
        isPresent: false,
        isNotApplicable: false,
        verifiedAt: null,
      };

      if (state.isNotApplicable) {
        continue;
      }

      const { gap } = computeGap(state, definition, new Date(0));
      const weight = definition.weight * closeness;

      totalWeight += weight;
      weightedGap += weight * gap;
    }
  }

  if (totalWeight === 0) {
    return 1;
  }

  return 1 - weightedGap / totalWeight;
}
