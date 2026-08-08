import {
  DQ_FIELD_CATALOG,
  type DqFieldKey,
  type DqFriendFieldState,
  type DqFriendFieldsResponse,
  type DqIndexResponse,
  type DqNotApplicableInput,
  type DqSnoozeInput,
  type DqSuggestionItem,
  type DqSuggestionsResponse,
  type DqWorthwhileEntry,
} from '@freundebuch/shared/index.js';
import type pg from 'pg';
import type { Logger } from 'pino';
import {
  getActiveSnoozes,
  getDataQualityFieldMeta,
  getDataQualityFriendRows,
  getDqIndexHistory,
  listUserExternalIds,
  setFieldNotApplicable,
  upsertDqIndexSnapshot,
  upsertSnooze,
} from '../../models/queries/data-quality.queries.js';
import { formatDateOnly } from '../../utils/date.js';
import {
  computeDqIndex,
  type DqFieldStateInput,
  type DqFriendInput,
  type DqItemScore,
  type DqScoreContext,
  type DqSnoozeState,
  dqTieBreak,
  resolveTier,
  scoreContact,
  scoreItems,
} from './scoring.js';

export interface DataQualityServiceOptions {
  db: pg.Pool;
  logger: Logger;
}

export type DqBucket = 'quickwins' | 'worthwhile';

/** Items this cheap are the "quick wins" bucket. */
const QUICK_WIN_MAX_COST = 1;

/** Number of items a worthwhile entry carries. */
const WORTHWHILE_ITEM_COUNT = 3;

const MILLISECONDS_PER_DAY = 86_400_000;

function roundTo4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Only catalog keys are scoreable; the column is deliberately unconstrained. */
function isCatalogFieldKey(value: string): value is DqFieldKey {
  return DQ_FIELD_CATALOG.some((definition) => definition.key === value);
}

/**
 * Data-quality suggestions, provenance state, snoozes and the DQ index.
 *
 * All scoring happens in the pure `./scoring.js` module; this service only loads
 * rows, assembles the scoring input and shapes the API response.
 */
export class DataQualityService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(options: DataQualityServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
  }

  /**
   * Load every scoreable friend plus the shared score context.
   */
  private async loadScoringInput(
    userExternalId: string,
  ): Promise<{ friends: DqFriendInput[]; ctx: DqScoreContext }> {
    const [rows, meta, snoozes] = await Promise.all([
      getDataQualityFriendRows.run({ userExternalId }, this.db),
      getDataQualityFieldMeta.run({ userExternalId }, this.db),
      getActiveSnoozes.run({ userExternalId }, this.db),
    ]);

    const fieldsByFriendId = new Map<string, DqFieldStateInput[]>();
    for (const row of meta) {
      if (!isCatalogFieldKey(row.field_key)) {
        continue;
      }
      const fields = fieldsByFriendId.get(row.friend_external_id) ?? [];
      fields.push({
        fieldKey: row.field_key,
        isPresent: row.is_present === true,
        isNotApplicable: row.is_not_applicable,
        verifiedAt: row.verified_at,
      });
      fieldsByFriendId.set(row.friend_external_id, fields);
    }

    const snoozesByFriendId = new Map<string, DqSnoozeState>();
    for (const row of snoozes) {
      const state = snoozesByFriendId.get(row.friend_external_id) ?? {
        friendSnoozed: false,
        snoozedFields: new Set<DqFieldKey>(),
      };
      if (row.field_key === null) {
        state.friendSnoozed = true;
      } else if (isCatalogFieldKey(row.field_key)) {
        (state.snoozedFields as Set<DqFieldKey>).add(row.field_key);
      }
      snoozesByFriendId.set(row.friend_external_id, state);
    }

    const now = new Date();
    const friends: DqFriendInput[] = rows.map((row) => ({
      friendId: row.external_id,
      displayName: row.display_name,
      photoThumbnailUrl: row.photo_thumbnail_url,
      tier: resolveTier(row.is_favorite, row.min_circle_sort_order),
      daysUntilBirthday: row.days_until_birthday,
      daysSinceLastEncounter: row.days_since_last_encounter,
      daysUntilNextEncounter: row.days_until_next_encounter,
      friendAgeInDays: Math.floor(
        (now.getTime() - row.created_at.getTime()) / MILLISECONDS_PER_DAY,
      ),
      fields: fieldsByFriendId.get(row.external_id) ?? [],
    }));

    return {
      friends,
      ctx: {
        now,
        today: formatDateOnly(now),
        catalog: DQ_FIELD_CATALOG,
        snoozesByFriendId,
      },
    };
  }

  private toSuggestionItem(friend: DqFriendInput, item: DqItemScore): DqSuggestionItem {
    return {
      friendId: friend.friendId,
      friendDisplayName: friend.displayName,
      ...(friend.photoThumbnailUrl === null ? {} : { photoThumbnailUrl: friend.photoThumbnailUrl }),
      fieldKey: item.fieldKey,
      score: roundTo4(item.score),
      gap: roundTo4(item.gap),
      isStale: item.isStale,
      ...(item.staleDays === undefined ? {} : { staleDays: item.staleDays }),
      reasons: item.reasons,
    };
  }

  async getSuggestions(
    userExternalId: string,
    limit: number,
    bucket: DqBucket | null,
  ): Promise<DqSuggestionsResponse> {
    const { friends, ctx } = await this.loadScoringInput(userExternalId);

    const scored = friends.map((friend) => ({
      friend,
      items: scoreItems(friend, ctx).filter((item) => item.score > 0),
    }));

    let quickWins: DqSuggestionItem[] = [];
    if (bucket !== 'worthwhile') {
      quickWins = scored
        .flatMap(({ friend, items }) =>
          items
            .filter((item) => item.definition.cost <= QUICK_WIN_MAX_COST)
            .map((item) => ({ friend, item })),
        )
        .sort(
          (a, b) =>
            b.item.score - a.item.score ||
            dqTieBreak(a.friend.friendId, a.item.fieldKey, ctx.today) -
              dqTieBreak(b.friend.friendId, b.item.fieldKey, ctx.today),
        )
        .slice(0, limit)
        .map(({ friend, item }) => this.toSuggestionItem(friend, item));
    }

    let worthwhile: DqWorthwhileEntry[] = [];
    if (bucket !== 'quickwins') {
      worthwhile = scored
        .map(({ friend, items }) => ({ friend, items, score: scoreContact(items) }))
        .filter((entry) => entry.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            dqTieBreak(a.friend.friendId, null, ctx.today) -
              dqTieBreak(b.friend.friendId, null, ctx.today),
        )
        .slice(0, limit)
        .map(({ friend, items, score }) => ({
          friendId: friend.friendId,
          friendDisplayName: friend.displayName,
          ...(friend.photoThumbnailUrl === null
            ? {}
            : { photoThumbnailUrl: friend.photoThumbnailUrl }),
          score: roundTo4(score),
          items: [...items]
            .sort(
              (a, b) =>
                b.score - a.score ||
                dqTieBreak(friend.friendId, a.fieldKey, ctx.today) -
                  dqTieBreak(friend.friendId, b.fieldKey, ctx.today),
            )
            .slice(0, WORTHWHILE_ITEM_COUNT)
            .map((item) => this.toSuggestionItem(friend, item)),
        }));
    }

    return { quickWins, worthwhile };
  }

  /**
   * Every catalog field for one friend, including the ones already filled in —
   * the detail page renders their "not applicable" toggles.
   */
  async getFriendFields(
    userExternalId: string,
    friendExternalId: string,
  ): Promise<DqFriendFieldsResponse | null> {
    const { friends, ctx } = await this.loadScoringInput(userExternalId);
    const friend = friends.find((candidate) => candidate.friendId === friendExternalId);

    if (friend === undefined) {
      return null;
    }

    const stateByKey = new Map(friend.fields.map((field) => [field.fieldKey, field]));
    const snoozes = ctx.snoozesByFriendId.get(friendExternalId);
    const scoredByKey = new Map(scoreItems(friend, ctx).map((item) => [item.fieldKey, item]));

    const fields: DqFriendFieldState[] = DQ_FIELD_CATALOG.map((definition) => {
      const state = stateByKey.get(definition.key);
      const isSnoozed =
        snoozes?.friendSnoozed === true || snoozes?.snoozedFields.has(definition.key) === true;

      return {
        fieldKey: definition.key,
        isPresent: state?.isPresent ?? false,
        isNotApplicable: state?.isNotApplicable ?? false,
        ...(state?.verifiedAt == null ? {} : { verifiedAt: state.verifiedAt.toISOString() }),
        isStale: scoredByKey.get(definition.key)?.isStale ?? false,
        isSnoozed,
      };
    });

    return { friendId: friendExternalId, fields };
  }

  async snooze(
    userExternalId: string,
    input: DqSnoozeInput,
  ): Promise<{ snoozedUntil: string; laterCount: number } | null> {
    this.logger.debug({ friendExternalId: input.friendId }, 'Snoozing data-quality suggestion');

    const [row] = await upsertSnooze.run(
      {
        userExternalId,
        friendExternalId: input.friendId,
        fieldKey: input.fieldKey ?? null,
        days: input.days,
        reason: input.reason,
      },
      this.db,
    );

    if (!row) {
      return null;
    }

    return { snoozedUntil: formatDateOnly(row.snoozed_until), laterCount: row.later_count };
  }

  async setNotApplicable(userExternalId: string, input: DqNotApplicableInput): Promise<boolean> {
    this.logger.debug(
      { friendExternalId: input.friendId, fieldKey: input.fieldKey },
      'Setting data-quality field applicability',
    );

    const rows = await setFieldNotApplicable.run(
      {
        userExternalId,
        friendExternalId: input.friendId,
        fieldKey: input.fieldKey,
        value: input.value,
      },
      this.db,
    );

    return rows.length > 0;
  }

  /**
   * `current` is computed live so the sparkline is never empty before the first
   * nightly snapshot.
   */
  async getIndex(userExternalId: string, days: number): Promise<DqIndexResponse> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [{ friends }, history] = await Promise.all([
      this.loadScoringInput(userExternalId),
      getDqIndexHistory.run({ userExternalId, sinceDate: formatDateOnly(since) }, this.db),
    ]);

    return {
      current: roundTo4(computeDqIndex(friends, DQ_FIELD_CATALOG)),
      history: history.map((row) => ({
        date: formatDateOnly(row.snapshot_date),
        // numeric comes back as a string from node-postgres.
        value: Number(row.index_value),
      })),
    };
  }

  async snapshotIndexForUser(userExternalId: string, today: string): Promise<number> {
    const { friends } = await this.loadScoringInput(userExternalId);
    const value = roundTo4(computeDqIndex(friends, DQ_FIELD_CATALOG));

    await upsertDqIndexSnapshot.run(
      { userExternalId, snapshotDate: today, indexValue: value },
      this.db,
    );

    return value;
  }

  async listUserExternalIds(): Promise<string[]> {
    const rows = await listUserExternalIds.run(undefined, this.db);
    return rows.map((row) => row.external_id);
  }
}
