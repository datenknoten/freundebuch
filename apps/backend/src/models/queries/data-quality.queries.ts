/** Types generated for queries found in "src/models/queries/data-quality.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'RefreshFieldMeta' parameters type */
export interface IRefreshFieldMetaParams {
  friendExternalId: string;
  source: string;
  userExternalId: string;
}

/** 'RefreshFieldMeta' return type */
export interface IRefreshFieldMetaResult {
  refreshed: undefined | null;
}

/** 'RefreshFieldMeta' query type */
export interface IRefreshFieldMetaQuery {
  params: IRefreshFieldMetaParams;
  result: IRefreshFieldMetaResult;
}

const refreshFieldMetaIR: any = {"usedParamSet":{"source":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"source","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":52}]},{"name":"friendExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":174}]},{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":213}]}],"statement":"SELECT data_quality.refresh_field_meta(c.id, :source!) AS refreshed\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId!\n  AND u.external_id = :userExternalId!\n  AND c.deleted_at IS NULL                                                                                                                                                                                                                                                                                                        "};

/**
 * Query generated from SQL:
 * ```
 * SELECT data_quality.refresh_field_meta(c.id, :source!) AS refreshed
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId!
 *   AND u.external_id = :userExternalId!
 *   AND c.deleted_at IS NULL                                                                                                                                                                                                                                                                                                        
 * ```
 */
export const refreshFieldMeta = new PreparedQuery<IRefreshFieldMetaParams,IRefreshFieldMetaResult>(refreshFieldMetaIR);


/** 'GetDataQualityFriendRows' parameters type */
export interface IGetDataQualityFriendRowsParams {
  userExternalId: string;
}

/** 'GetDataQualityFriendRows' return type */
export interface IGetDataQualityFriendRowsResult {
  created_at: Date;
  days_since_last_encounter: number | null;
  days_until_birthday: number | null;
  days_until_next_encounter: number | null;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Whether this friend is marked as a favorite */
  is_favorite: boolean;
  min_circle_sort_order: number | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
}

/** 'GetDataQualityFriendRows' query type */
export interface IGetDataQualityFriendRowsQuery {
  params: IGetDataQualityFriendRowsParams;
  result: IGetDataQualityFriendRowsResult;
}

const getDataQualityFriendRowsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":283}]}],"statement":"WITH scoreable AS (\n    SELECT\n        c.id,\n        c.external_id,\n        c.display_name,\n        c.photo_thumbnail_url,\n        c.is_favorite,\n        c.created_at\n    FROM friends.friends c\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId!\n      AND c.deleted_at IS NULL\n      AND c.archived_at IS NULL\n      AND (u.self_profile_id IS NULL OR c.id <> u.self_profile_id)\n),\nbirthday_calc AS (\n    SELECT\n        s.id AS friend_id,\n        EXTRACT(MONTH FROM d.date_value)::int AS date_month,\n        EXTRACT(DAY FROM d.date_value)::int AS date_day,\n        EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year\n    FROM scoreable s\n    INNER JOIN friends.friend_dates d ON d.friend_id = s.id\n    WHERE d.date_type = 'birthday'\n),\nbirthday_safe AS (\n    SELECT\n        bc.*,\n        -- Handle Feb 29 in non-leap years by using Feb 28\n        CASE\n            WHEN bc.date_month = 2 AND bc.date_day = 29\n                 AND NOT (bc.current_year % 4 = 0 AND (bc.current_year % 100 != 0 OR bc.current_year % 400 = 0))\n            THEN 28\n            ELSE bc.date_day\n        END AS safe_day_current,\n        CASE\n            WHEN bc.date_month = 2 AND bc.date_day = 29\n                 AND NOT ((bc.current_year + 1) % 4 = 0 AND ((bc.current_year + 1) % 100 != 0 OR (bc.current_year + 1) % 400 = 0))\n            THEN 28\n            ELSE bc.date_day\n        END AS safe_day_next\n    FROM birthday_calc bc\n),\nbirthday_days AS (\n    SELECT\n        bs.friend_id,\n        MIN(\n            CASE\n                WHEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) >= CURRENT_DATE\n                THEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) - CURRENT_DATE\n                ELSE MAKE_DATE(bs.current_year + 1, bs.date_month, bs.safe_day_next) - CURRENT_DATE\n            END\n        ) AS days_until_birthday\n    FROM birthday_safe bs\n    GROUP BY bs.friend_id\n)\nSELECT\n    s.external_id,\n    s.display_name,\n    s.photo_thumbnail_url,\n    s.is_favorite,\n    s.created_at,\n    (\n        SELECT MIN(ci.sort_order)\n        FROM friends.friend_circles fc\n        INNER JOIN friends.circles ci ON fc.circle_id = ci.id\n        WHERE fc.friend_id = s.id\n    ) AS min_circle_sort_order,\n    bd.days_until_birthday,\n    (\n        SELECT CURRENT_DATE - MAX(e.encounter_date)\n        FROM encounters.encounters e\n        INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id\n        WHERE ef.friend_id = s.id\n          AND e.encounter_date <= CURRENT_DATE\n    ) AS days_since_last_encounter,\n    (\n        SELECT MIN(e.encounter_date) - CURRENT_DATE\n        FROM encounters.encounters e\n        INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id\n        WHERE ef.friend_id = s.id\n          AND e.encounter_date > CURRENT_DATE\n    ) AS days_until_next_encounter\nFROM scoreable s\nLEFT JOIN birthday_days bd ON bd.friend_id = s.id                                                                                                                                                                                                                "};

/**
 * Query generated from SQL:
 * ```
 * WITH scoreable AS (
 *     SELECT
 *         c.id,
 *         c.external_id,
 *         c.display_name,
 *         c.photo_thumbnail_url,
 *         c.is_favorite,
 *         c.created_at
 *     FROM friends.friends c
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId!
 *       AND c.deleted_at IS NULL
 *       AND c.archived_at IS NULL
 *       AND (u.self_profile_id IS NULL OR c.id <> u.self_profile_id)
 * ),
 * birthday_calc AS (
 *     SELECT
 *         s.id AS friend_id,
 *         EXTRACT(MONTH FROM d.date_value)::int AS date_month,
 *         EXTRACT(DAY FROM d.date_value)::int AS date_day,
 *         EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year
 *     FROM scoreable s
 *     INNER JOIN friends.friend_dates d ON d.friend_id = s.id
 *     WHERE d.date_type = 'birthday'
 * ),
 * birthday_safe AS (
 *     SELECT
 *         bc.*,
 *         -- Handle Feb 29 in non-leap years by using Feb 28
 *         CASE
 *             WHEN bc.date_month = 2 AND bc.date_day = 29
 *                  AND NOT (bc.current_year % 4 = 0 AND (bc.current_year % 100 != 0 OR bc.current_year % 400 = 0))
 *             THEN 28
 *             ELSE bc.date_day
 *         END AS safe_day_current,
 *         CASE
 *             WHEN bc.date_month = 2 AND bc.date_day = 29
 *                  AND NOT ((bc.current_year + 1) % 4 = 0 AND ((bc.current_year + 1) % 100 != 0 OR (bc.current_year + 1) % 400 = 0))
 *             THEN 28
 *             ELSE bc.date_day
 *         END AS safe_day_next
 *     FROM birthday_calc bc
 * ),
 * birthday_days AS (
 *     SELECT
 *         bs.friend_id,
 *         MIN(
 *             CASE
 *                 WHEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) >= CURRENT_DATE
 *                 THEN MAKE_DATE(bs.current_year, bs.date_month, bs.safe_day_current) - CURRENT_DATE
 *                 ELSE MAKE_DATE(bs.current_year + 1, bs.date_month, bs.safe_day_next) - CURRENT_DATE
 *             END
 *         ) AS days_until_birthday
 *     FROM birthday_safe bs
 *     GROUP BY bs.friend_id
 * )
 * SELECT
 *     s.external_id,
 *     s.display_name,
 *     s.photo_thumbnail_url,
 *     s.is_favorite,
 *     s.created_at,
 *     (
 *         SELECT MIN(ci.sort_order)
 *         FROM friends.friend_circles fc
 *         INNER JOIN friends.circles ci ON fc.circle_id = ci.id
 *         WHERE fc.friend_id = s.id
 *     ) AS min_circle_sort_order,
 *     bd.days_until_birthday,
 *     (
 *         SELECT CURRENT_DATE - MAX(e.encounter_date)
 *         FROM encounters.encounters e
 *         INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
 *         WHERE ef.friend_id = s.id
 *           AND e.encounter_date <= CURRENT_DATE
 *     ) AS days_since_last_encounter,
 *     (
 *         SELECT MIN(e.encounter_date) - CURRENT_DATE
 *         FROM encounters.encounters e
 *         INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
 *         WHERE ef.friend_id = s.id
 *           AND e.encounter_date > CURRENT_DATE
 *     ) AS days_until_next_encounter
 * FROM scoreable s
 * LEFT JOIN birthday_days bd ON bd.friend_id = s.id                                                                                                                                                                                                                
 * ```
 */
export const getDataQualityFriendRows = new PreparedQuery<IGetDataQualityFriendRowsParams,IGetDataQualityFriendRowsResult>(getDataQualityFriendRowsIR);


/** 'GetDataQualityFieldMeta' parameters type */
export interface IGetDataQualityFieldMetaParams {
  userExternalId: string;
}

/** 'GetDataQualityFieldMeta' return type */
export interface IGetDataQualityFieldMetaResult {
  /** Catalog field key. Deliberately unconstrained against a value list: the catalog is versioned in TypeScript (packages/shared/src/data-quality.ts) so adding a field must not require a migration */
  field_key: string;
  /** Public UUID for API exposure (always use this in APIs) */
  friend_external_id: string;
  /** User marked this field as never relevant for this friend */
  is_not_applicable: boolean;
  is_present: boolean | null;
  /** When the value last actually changed, i.e. was confirmed to be current */
  verified_at: Date | null;
}

/** 'GetDataQualityFieldMeta' query type */
export interface IGetDataQualityFieldMetaQuery {
  params: IGetDataQualityFieldMetaParams;
  result: IGetDataQualityFieldMetaResult;
}

const getDataQualityFieldMetaIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":309,"b":324}]}],"statement":"SELECT\n    c.external_id AS friend_external_id,\n    m.field_key,\n    (m.value_fingerprint IS NOT NULL) AS is_present,\n    m.verified_at,\n    m.is_not_applicable\nFROM data_quality.field_meta m\nINNER JOIN friends.friends c ON m.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId!\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id AS friend_external_id,
 *     m.field_key,
 *     (m.value_fingerprint IS NOT NULL) AS is_present,
 *     m.verified_at,
 *     m.is_not_applicable
 * FROM data_quality.field_meta m
 * INNER JOIN friends.friends c ON m.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId!
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getDataQualityFieldMeta = new PreparedQuery<IGetDataQualityFieldMetaParams,IGetDataQualityFieldMetaResult>(getDataQualityFieldMetaIR);


/** 'GetActiveSnoozes' parameters type */
export interface IGetActiveSnoozesParams {
  userExternalId: string;
}

/** 'GetActiveSnoozes' return type */
export interface IGetActiveSnoozesResult {
  /** Catalog field key. NULL snoozes the whole friend */
  field_key: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  friend_external_id: string;
  /** Suggestions stay hidden up to and including this day */
  snoozed_until: Date;
}

/** 'GetActiveSnoozes' query type */
export interface IGetActiveSnoozesQuery {
  params: IGetActiveSnoozesParams;
  result: IGetActiveSnoozesResult;
}

const getActiveSnoozesIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":245}]}],"statement":"SELECT\n    c.external_id AS friend_external_id,\n    s.field_key,\n    s.snoozed_until\nFROM data_quality.snoozes s\nINNER JOIN friends.friends c ON s.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId!\n  AND c.deleted_at IS NULL\n  AND s.snoozed_until >= CURRENT_DATE                                                                                                                                                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id AS friend_external_id,
 *     s.field_key,
 *     s.snoozed_until
 * FROM data_quality.snoozes s
 * INNER JOIN friends.friends c ON s.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId!
 *   AND c.deleted_at IS NULL
 *   AND s.snoozed_until >= CURRENT_DATE                                                                                                                                                                   
 * ```
 */
export const getActiveSnoozes = new PreparedQuery<IGetActiveSnoozesParams,IGetActiveSnoozesResult>(getActiveSnoozesIR);


/** 'UpsertSnooze' parameters type */
export interface IUpsertSnoozeParams {
  days: number;
  fieldKey?: string | null | void;
  friendExternalId: string;
  reason: string;
  userExternalId: string;
}

/** 'UpsertSnooze' return type */
export interface IUpsertSnoozeResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Catalog field key. NULL snoozes the whole friend */
  field_key: string | null;
  /** Consecutive "Später" presses; the second one escalates the snooze to 90 days */
  later_count: number;
  /** Why the suggestion was deferred */
  reason: string | null;
  /** Suggestions stay hidden up to and including this day */
  snoozed_until: Date;
}

/** 'UpsertSnooze' query type */
export interface IUpsertSnoozeQuery {
  params: IUpsertSnoozeParams;
  result: IUpsertSnoozeResult;
}

const upsertSnoozeIR: any = {"usedParamSet":{"fieldKey":true,"days":true,"reason":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"fieldKey","required":false,"transform":{"type":"scalar"},"locs":[{"a":113,"b":121}]},{"name":"days","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":149}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":175},{"a":192,"b":199}]},{"name":"friendExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":318,"b":335}]},{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":359,"b":374}]}],"statement":"INSERT INTO data_quality.snoozes (friend_id, field_key, snoozed_until, reason, later_count)\nSELECT\n    c.id,\n    :fieldKey,\n    (CURRENT_DATE + :days!::int)::date,\n    :reason!,\n    CASE WHEN :reason! = 'later' THEN 1 ELSE 0 END\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId!\n  AND u.external_id = :userExternalId!\n  AND c.deleted_at IS NULL\nON CONFLICT (friend_id, COALESCE(field_key, ''))\nDO UPDATE SET\n    later_count = CASE WHEN EXCLUDED.reason = 'later'\n                       THEN snoozes.later_count + 1 ELSE 0 END,\n    reason = EXCLUDED.reason,\n    snoozed_until = CASE WHEN EXCLUDED.reason = 'later' AND snoozes.later_count >= 1\n                         THEN (CURRENT_DATE + INTERVAL '90 days')::date\n                         ELSE EXCLUDED.snoozed_until END,\n    updated_at = CURRENT_TIMESTAMP\nRETURNING external_id, field_key, snoozed_until, reason, later_count"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO data_quality.snoozes (friend_id, field_key, snoozed_until, reason, later_count)
 * SELECT
 *     c.id,
 *     :fieldKey,
 *     (CURRENT_DATE + :days!::int)::date,
 *     :reason!,
 *     CASE WHEN :reason! = 'later' THEN 1 ELSE 0 END
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId!
 *   AND u.external_id = :userExternalId!
 *   AND c.deleted_at IS NULL
 * ON CONFLICT (friend_id, COALESCE(field_key, ''))
 * DO UPDATE SET
 *     later_count = CASE WHEN EXCLUDED.reason = 'later'
 *                        THEN snoozes.later_count + 1 ELSE 0 END,
 *     reason = EXCLUDED.reason,
 *     snoozed_until = CASE WHEN EXCLUDED.reason = 'later' AND snoozes.later_count >= 1
 *                          THEN (CURRENT_DATE + INTERVAL '90 days')::date
 *                          ELSE EXCLUDED.snoozed_until END,
 *     updated_at = CURRENT_TIMESTAMP
 * RETURNING external_id, field_key, snoozed_until, reason, later_count
 * ```
 */
export const upsertSnooze = new PreparedQuery<IUpsertSnoozeParams,IUpsertSnoozeResult>(upsertSnoozeIR);


/** 'SetFieldNotApplicable' parameters type */
export interface ISetFieldNotApplicableParams {
  fieldKey: string;
  friendExternalId: string;
  userExternalId: string;
  value: boolean;
}

/** 'SetFieldNotApplicable' return type */
export interface ISetFieldNotApplicableResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** Catalog field key. Deliberately unconstrained against a value list: the catalog is versioned in TypeScript (packages/shared/src/data-quality.ts) so adding a field must not require a migration */
  field_key: string;
  /** User marked this field as never relevant for this friend */
  is_not_applicable: boolean;
}

/** 'SetFieldNotApplicable' query type */
export interface ISetFieldNotApplicableQuery {
  params: ISetFieldNotApplicableParams;
  result: ISetFieldNotApplicableResult;
}

const setFieldNotApplicableIR: any = {"usedParamSet":{"fieldKey":true,"value":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"fieldKey","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":108}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":117}]},{"name":"friendExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":244}]},{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":283}]}],"statement":"INSERT INTO data_quality.field_meta (friend_id, field_key, is_not_applicable, source)\nSELECT c.id, :fieldKey!, :value!::boolean, 'manual'\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId!\n  AND u.external_id = :userExternalId!\n  AND c.deleted_at IS NULL\nON CONFLICT (friend_id, field_key)\nDO UPDATE SET\n    is_not_applicable = EXCLUDED.is_not_applicable,\n    updated_at = CURRENT_TIMESTAMP\nRETURNING external_id, field_key, is_not_applicable"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO data_quality.field_meta (friend_id, field_key, is_not_applicable, source)
 * SELECT c.id, :fieldKey!, :value!::boolean, 'manual'
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId!
 *   AND u.external_id = :userExternalId!
 *   AND c.deleted_at IS NULL
 * ON CONFLICT (friend_id, field_key)
 * DO UPDATE SET
 *     is_not_applicable = EXCLUDED.is_not_applicable,
 *     updated_at = CURRENT_TIMESTAMP
 * RETURNING external_id, field_key, is_not_applicable
 * ```
 */
export const setFieldNotApplicable = new PreparedQuery<ISetFieldNotApplicableParams,ISetFieldNotApplicableResult>(setFieldNotApplicableIR);


/** 'GetDqIndexHistory' parameters type */
export interface IGetDqIndexHistoryParams {
  sinceDate: DateOrString;
  userExternalId: string;
}

/** 'GetDqIndexHistory' return type */
export interface IGetDqIndexHistoryResult {
  /** 1 - weighted gap share across all applicable (friend, field) pairs */
  index_value: string;
  /** Calendar day the snapshot belongs to */
  snapshot_date: Date;
}

/** 'GetDqIndexHistory' query type */
export interface IGetDqIndexHistoryQuery {
  params: IGetDqIndexHistoryParams;
  result: IGetDqIndexHistoryResult;
}

const getDqIndexHistoryIR: any = {"usedParamSet":{"userExternalId":true,"sinceDate":true},"params":[{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":153}]},{"name":"sinceDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":190}]}],"statement":"SELECT h.snapshot_date, h.index_value\nFROM data_quality.index_history h\nINNER JOIN auth.users u ON h.user_id = u.id\nWHERE u.external_id = :userExternalId!\n  AND h.snapshot_date >= :sinceDate!::date\nORDER BY h.snapshot_date ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT h.snapshot_date, h.index_value
 * FROM data_quality.index_history h
 * INNER JOIN auth.users u ON h.user_id = u.id
 * WHERE u.external_id = :userExternalId!
 *   AND h.snapshot_date >= :sinceDate!::date
 * ORDER BY h.snapshot_date ASC
 * ```
 */
export const getDqIndexHistory = new PreparedQuery<IGetDqIndexHistoryParams,IGetDqIndexHistoryResult>(getDqIndexHistoryIR);


/** 'UpsertDqIndexSnapshot' parameters type */
export interface IUpsertDqIndexSnapshotParams {
  indexValue: NumberOrString;
  snapshotDate: DateOrString;
  userExternalId: string;
}

/** 'UpsertDqIndexSnapshot' return type */
export interface IUpsertDqIndexSnapshotResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** 1 - weighted gap share across all applicable (friend, field) pairs */
  index_value: string;
  /** Calendar day the snapshot belongs to */
  snapshot_date: Date;
}

/** 'UpsertDqIndexSnapshot' query type */
export interface IUpsertDqIndexSnapshotQuery {
  params: IUpsertDqIndexSnapshotParams;
  result: IUpsertDqIndexSnapshotResult;
}

const upsertDqIndexSnapshotIR: any = {"usedParamSet":{"snapshotDate":true,"indexValue":true,"userExternalId":true},"params":[{"name":"snapshotDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":103}]},{"name":"indexValue","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":123}]},{"name":"userExternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":189}]}],"statement":"INSERT INTO data_quality.index_history (user_id, snapshot_date, index_value)\nSELECT u.id, :snapshotDate!::date, :indexValue!::numeric\nFROM auth.users u\nWHERE u.external_id = :userExternalId!\nON CONFLICT (user_id, snapshot_date)\nDO UPDATE SET\n    index_value = EXCLUDED.index_value,\n    updated_at = CURRENT_TIMESTAMP\nRETURNING external_id, snapshot_date, index_value"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO data_quality.index_history (user_id, snapshot_date, index_value)
 * SELECT u.id, :snapshotDate!::date, :indexValue!::numeric
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId!
 * ON CONFLICT (user_id, snapshot_date)
 * DO UPDATE SET
 *     index_value = EXCLUDED.index_value,
 *     updated_at = CURRENT_TIMESTAMP
 * RETURNING external_id, snapshot_date, index_value
 * ```
 */
export const upsertDqIndexSnapshot = new PreparedQuery<IUpsertDqIndexSnapshotParams,IUpsertDqIndexSnapshotResult>(upsertDqIndexSnapshotIR);


/** 'ListUserExternalIds' parameters type */
export type IListUserExternalIdsParams = void;

/** 'ListUserExternalIds' return type */
export interface IListUserExternalIdsResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'ListUserExternalIds' query type */
export interface IListUserExternalIdsQuery {
  params: IListUserExternalIdsParams;
  result: IListUserExternalIdsResult;
}

const listUserExternalIdsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT external_id FROM auth.users"};

/**
 * Query generated from SQL:
 * ```
 * SELECT external_id FROM auth.users
 * ```
 */
export const listUserExternalIds = new PreparedQuery<IListUserExternalIdsParams,IListUserExternalIdsResult>(listUserExternalIdsIR);


