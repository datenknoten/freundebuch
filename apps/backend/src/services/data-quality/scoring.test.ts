import { DQ_FIELD_CATALOG, type DqFieldKey } from '@freundebuch/shared/index.js';
import { describe, expect, it } from 'vitest';
import {
  computeDqIndex,
  type DqFieldStateInput,
  type DqFriendInput,
  type DqItemScore,
  type DqScoreContext,
  dqTieBreak,
  resolveTier,
  scoreContact,
  scoreItems,
} from './scoring.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const TODAY = '2026-06-15';
const MILLISECONDS_PER_DAY = 86_400_000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
}

function context(overrides: Partial<DqScoreContext> = {}): DqScoreContext {
  return {
    now: NOW,
    today: TODAY,
    catalog: DQ_FIELD_CATALOG,
    snoozesByFriendId: new Map(),
    ...overrides,
  };
}

function friend(overrides: Partial<DqFriendInput> = {}): DqFriendInput {
  return {
    friendId: 'friend-a',
    displayName: 'Anna Müller',
    photoThumbnailUrl: null,
    tier: 1,
    daysUntilBirthday: null,
    daysSinceLastEncounter: null,
    daysUntilNextEncounter: null,
    friendAgeInDays: 500,
    fields: [],
    ...overrides,
  };
}

/** Every catalog field present and fresh, so a single gap can be isolated. */
function allFieldsPresent(overrides: Partial<Record<DqFieldKey, DqFieldStateInput>> = {}) {
  return DQ_FIELD_CATALOG.map(
    (definition) =>
      overrides[definition.key] ?? {
        fieldKey: definition.key,
        isPresent: true,
        isNotApplicable: false,
        verifiedAt: NOW,
      },
  );
}

function itemFor(items: DqItemScore[], fieldKey: DqFieldKey): DqItemScore | undefined {
  return items.find((item) => item.fieldKey === fieldKey);
}

describe('scoreItems', () => {
  it('reports a full gap for an empty field', () => {
    const items = scoreItems(friend(), context());

    expect(itemFor(items, 'birthday')?.gap).toBe(1);
  });

  it('emits no item for a field marked as not applicable', () => {
    const items = scoreItems(
      friend({
        fields: [
          { fieldKey: 'birthday', isPresent: false, isNotApplicable: true, verifiedAt: null },
        ],
      }),
      context(),
    );

    expect(itemFor(items, 'birthday')).toBeUndefined();
    expect(items).not.toHaveLength(0);
  });

  describe('TTL expiry', () => {
    // phone_mobile has ttlDays 1095.
    it.each([
      { age: 1095, expected: 0, label: 'exactly at the TTL' },
      { age: 2190, expected: 1, label: 'at twice the TTL' },
      { age: 1642, expected: 0.4995, label: 'mid-range' },
    ])('gap is $expected $label', ({ age, expected }) => {
      const items = scoreItems(
        friend({
          fields: allFieldsPresent({
            phone_mobile: {
              fieldKey: 'phone_mobile',
              isPresent: true,
              isNotApplicable: false,
              verifiedAt: daysAgo(age),
            },
          }),
        }),
        context(),
      );

      expect(itemFor(items, 'phone_mobile')?.gap).toBeCloseTo(expected, 3);
    });

    it('marks an expired present value as stale with its age in days', () => {
      const items = scoreItems(
        friend({
          fields: allFieldsPresent({
            phone_mobile: {
              fieldKey: 'phone_mobile',
              isPresent: true,
              isNotApplicable: false,
              verifiedAt: daysAgo(2190),
            },
          }),
        }),
        context(),
      );

      expect(itemFor(items, 'phone_mobile')?.isStale).toBe(true);
      expect(itemFor(items, 'phone_mobile')?.staleDays).toBe(2190);
    });

    it('does not treat a present value without provenance as stale', () => {
      const items = scoreItems(
        friend({
          fields: allFieldsPresent({
            phone_mobile: {
              fieldKey: 'phone_mobile',
              isPresent: true,
              isNotApplicable: false,
              verifiedAt: null,
            },
          }),
        }),
        context(),
      );

      expect(itemFor(items, 'phone_mobile')?.gap).toBe(0);
      expect(itemFor(items, 'phone_mobile')?.isStale).toBe(false);
    });
  });

  describe('birthday boost', () => {
    it('boosts card-relevant fields inside the 45 day horizon', () => {
      const items = scoreItems(friend({ daysUntilBirthday: 44 }), context());
      const address = itemFor(items, 'address_postal');

      expect(address?.urgency).toBe(1.8);
      expect(address?.reasons).toContainEqual({ kind: 'birthday_soon', days: 44 });
    });

    it('does not boost outside the horizon', () => {
      const items = scoreItems(friend({ daysUntilBirthday: 46 }), context());
      const address = itemFor(items, 'address_postal');

      expect(address?.urgency).toBe(1);
      expect(address?.reasons).toEqual([]);
    });

    it('does not boost fields that are not card- or gift-relevant', () => {
      const items = scoreItems(friend({ daysUntilBirthday: 44 }), context());
      const email = itemFor(items, 'email');

      expect(email?.urgency).toBe(1);
      expect(email?.reasons).toEqual([]);
    });
  });

  describe('snoozes', () => {
    it('removes exactly the snoozed field', () => {
      const items = scoreItems(
        friend(),
        context({
          snoozesByFriendId: new Map([
            ['friend-a', { friendSnoozed: false, snoozedFields: new Set<DqFieldKey>(['email']) }],
          ]),
        }),
      );

      expect(itemFor(items, 'email')).toBeUndefined();
      expect(itemFor(items, 'birthday')).toBeDefined();
    });

    it('drops every item when the whole friend is snoozed', () => {
      const items = scoreItems(
        friend(),
        context({
          snoozesByFriendId: new Map([
            ['friend-a', { friendSnoozed: true, snoozedFields: new Set<DqFieldKey>() }],
          ]),
        }),
      );

      expect(items).toEqual([]);
    });
  });
});

describe('scoreContact', () => {
  it('ranks a close friend with one gap above a distant friend with nine', () => {
    const closeFriend = friend({
      friendId: 'close',
      tier: 1,
      fields: allFieldsPresent({
        phone_mobile: {
          fieldKey: 'phone_mobile',
          isPresent: false,
          isNotApplicable: false,
          verifiedAt: null,
        },
      }),
    });
    const distantFriend = friend({ friendId: 'distant', tier: 4 });

    const closeScore = scoreContact(scoreItems(closeFriend, context()));
    const distantScore = scoreContact(scoreItems(distantFriend, context()));

    // tier-1 missing mobile: 8 * 1 * 1.0 * 1 / 1^0.6 = 8
    expect(closeScore).toBeCloseTo(8, 4);
    // tier-4, all empty, top three by score:
    //   phone_mobile 8 * 0.25 / 1^0.6      = 2.0000
    //   birthday    10 * 0.25 / 2^0.6      = 1.6494
    //   email        5 * 0.25 / 1^0.6      = 1.2500
    expect(distantScore).toBeCloseTo(4.8994, 3);
    expect(closeScore).toBeGreaterThan(distantScore);
  });

  it('sums only the three highest item scores', () => {
    const items = scoreItems(friend({ tier: 1 }), context());
    const topThree = items
      .map((item) => item.score)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((sum, score) => sum + score, 0);

    expect(scoreContact(items)).toBeCloseTo(topThree, 6);
  });
});

describe('computeDqIndex', () => {
  it('returns 1 when every field is not applicable', () => {
    const allNotApplicable = friend({
      fields: DQ_FIELD_CATALOG.map((definition) => ({
        fieldKey: definition.key,
        isPresent: false,
        isNotApplicable: true,
        verifiedAt: null,
      })),
    });

    expect(computeDqIndex([allNotApplicable], DQ_FIELD_CATALOG)).toBe(1);
  });

  it('returns 0 when every applicable field is empty', () => {
    expect(computeDqIndex([friend()], DQ_FIELD_CATALOG)).toBe(0);
  });

  it('returns 1 when every applicable field is filled', () => {
    expect(computeDqIndex([friend({ fields: allFieldsPresent() })], DQ_FIELD_CATALOG)).toBe(1);
  });
});

describe('dqTieBreak', () => {
  it('is stable for the same inputs', () => {
    expect(dqTieBreak('friend-a', 'email', TODAY)).toBe(dqTieBreak('friend-a', 'email', TODAY));
  });

  it('differs on an adjacent day', () => {
    expect(dqTieBreak('friend-a', 'email', TODAY)).not.toBe(
      dqTieBreak('friend-a', 'email', '2026-06-16'),
    );
  });

  it('distinguishes the contact-level hash from a field-level one', () => {
    expect(dqTieBreak('friend-a', null, TODAY)).not.toBe(dqTieBreak('friend-a', 'email', TODAY));
  });
});

describe('resolveTier', () => {
  it.each([
    { isFavorite: true, sortOrder: 3, expected: 1, label: 'a favourite is always tier 1' },
    { isFavorite: false, sortOrder: 0, expected: 1, label: 'the closest circle maps to tier 1' },
    { isFavorite: false, sortOrder: 2, expected: 3, label: 'sort_order 2 maps to tier 3' },
    { isFavorite: false, sortOrder: 9, expected: 4, label: 'far circles clamp to tier 4' },
    { isFavorite: false, sortOrder: null, expected: 4, label: 'no circle means tier 4' },
  ])('$label', ({ isFavorite, sortOrder, expected }) => {
    expect(resolveTier(isFavorite, sortOrder)).toBe(expected);
  });
});
