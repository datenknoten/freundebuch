/** Types generated for queries found in "src/models/queries/friend-dates.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetDatesByFriendId' parameters type */
export interface IGetDatesByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetDatesByFriendId' return type */
export interface IGetDatesByFriendIdResult {
  created_at: Date;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label (especially for "other" type) */
  label: string | null;
  /** Whether the year is known (false = only month/day) */
  year_known: boolean;
}

/** 'GetDatesByFriendId' query type */
export interface IGetDatesByFriendIdQuery {
  params: IGetDatesByFriendIdParams;
  result: IGetDatesByFriendIdResult;
}

const getDatesByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":270}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":308}]}],"statement":"SELECT\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at\nFROM friends.friend_dates d\nINNER JOIN friends.friends c ON d.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY d.date_type ASC, d.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     d.external_id,
 *     d.date_value,
 *     d.year_known,
 *     d.date_type,
 *     d.label,
 *     d.created_at
 * FROM friends.friend_dates d
 * INNER JOIN friends.friends c ON d.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY d.date_type ASC, d.created_at ASC
 * ```
 */
export const getDatesByFriendId = new PreparedQuery<IGetDatesByFriendIdParams,IGetDatesByFriendIdResult>(getDatesByFriendIdIR);


/** 'GetDateById' parameters type */
export interface IGetDateByIdParams {
  dateExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetDateById' return type */
export interface IGetDateByIdResult {
  created_at: Date;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label (especially for "other" type) */
  label: string | null;
  /** Whether the year is known (false = only month/day) */
  year_known: boolean;
}

/** 'GetDateById' query type */
export interface IGetDateByIdQuery {
  params: IGetDateByIdParams;
  result: IGetDateByIdResult;
}

const getDateByIdIR: any = {"usedParamSet":{"dateExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":268}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":308}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":332,"b":346}]}],"statement":"SELECT\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at\nFROM friends.friend_dates d\nINNER JOIN friends.friends c ON d.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE d.external_id = :dateExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     d.external_id,
 *     d.date_value,
 *     d.year_known,
 *     d.date_type,
 *     d.label,
 *     d.created_at
 * FROM friends.friend_dates d
 * INNER JOIN friends.friends c ON d.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE d.external_id = :dateExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getDateById = new PreparedQuery<IGetDateByIdParams,IGetDateByIdResult>(getDateByIdIR);


/** 'CreateDate' parameters type */
export interface ICreateDateParams {
  dateType?: string | null | void;
  dateValue?: DateOrString | null | void;
  friendExternalId?: string | null | void;
  label?: string | null | void;
  userExternalId?: string | null | void;
  yearKnown?: boolean | null | void;
}

/** 'CreateDate' return type */
export interface ICreateDateResult {
  created_at: Date;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label (especially for "other" type) */
  label: string | null;
  /** Whether the year is known (false = only month/day) */
  year_known: boolean;
}

/** 'CreateDate' query type */
export interface ICreateDateQuery {
  params: ICreateDateParams;
  result: ICreateDateResult;
}

const createDateIR: any = {"usedParamSet":{"dateValue":true,"yearKnown":true,"dateType":true,"label":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"dateValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":139}]},{"name":"yearKnown","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":161}]},{"name":"dateType","required":false,"transform":{"type":"scalar"},"locs":[{"a":168,"b":176}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":188}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":295}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":319,"b":333}]}],"statement":"INSERT INTO friends.friend_dates (\n    friend_id,\n    date_value,\n    year_known,\n    date_type,\n    label\n)\nSELECT\n    c.id,\n    :dateValue::date,\n    :yearKnown,\n    :dateType,\n    :label\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    date_value,\n    year_known,\n    date_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_dates (
 *     friend_id,
 *     date_value,
 *     year_known,
 *     date_type,
 *     label
 * )
 * SELECT
 *     c.id,
 *     :dateValue::date,
 *     :yearKnown,
 *     :dateType,
 *     :label
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     date_value,
 *     year_known,
 *     date_type,
 *     label,
 *     created_at
 * ```
 */
export const createDate = new PreparedQuery<ICreateDateParams,ICreateDateResult>(createDateIR);


/** 'UpdateDate' parameters type */
export interface IUpdateDateParams {
  dateExternalId?: string | null | void;
  dateType?: string | null | void;
  dateValue?: DateOrString | null | void;
  friendExternalId?: string | null | void;
  label?: string | null | void;
  userExternalId?: string | null | void;
  yearKnown?: boolean | null | void;
}

/** 'UpdateDate' return type */
export interface IUpdateDateResult {
  created_at: Date;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** User-defined label (especially for "other" type) */
  label: string | null;
  /** Whether the year is known (false = only month/day) */
  year_known: boolean;
}

/** 'UpdateDate' query type */
export interface IUpdateDateQuery {
  params: IUpdateDateParams;
  result: IUpdateDateResult;
}

const updateDateIR: any = {"usedParamSet":{"dateValue":true,"yearKnown":true,"dateType":true,"label":true,"dateExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"dateValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":51,"b":60}]},{"name":"yearKnown","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":95}]},{"name":"dateType","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":122}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":142}]},{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":247}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":312}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":350}]}],"statement":"UPDATE friends.friend_dates d\nSET\n    date_value = :dateValue::date,\n    year_known = :yearKnown,\n    date_type = :dateType,\n    label = :label\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE d.external_id = :dateExternalId\n  AND d.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_dates d
 * SET
 *     date_value = :dateValue::date,
 *     year_known = :yearKnown,
 *     date_type = :dateType,
 *     label = :label
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE d.external_id = :dateExternalId
 *   AND d.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     d.external_id,
 *     d.date_value,
 *     d.year_known,
 *     d.date_type,
 *     d.label,
 *     d.created_at
 * ```
 */
export const updateDate = new PreparedQuery<IUpdateDateParams,IUpdateDateResult>(updateDateIR);


/** 'DeleteDate' parameters type */
export interface IDeleteDateParams {
  dateExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteDate' return type */
export interface IDeleteDateResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteDate' query type */
export interface IDeleteDateQuery {
  params: IDeleteDateParams;
  result: IDeleteDateResult;
}

const deleteDateIR: any = {"usedParamSet":{"dateExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":95,"b":109}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":181,"b":197}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":235}]}],"statement":"DELETE FROM friends.friend_dates d\nUSING friends.friends c, auth.users u\nWHERE d.external_id = :dateExternalId\n  AND d.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING d.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_dates d
 * USING friends.friends c, auth.users u
 * WHERE d.external_id = :dateExternalId
 *   AND d.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING d.external_id
 * ```
 */
export const deleteDate = new PreparedQuery<IDeleteDateParams,IDeleteDateResult>(deleteDateIR);


/** 'CountBirthdaysForFriend' parameters type */
export interface ICountBirthdaysForFriendParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CountBirthdaysForFriend' return type */
export interface ICountBirthdaysForFriendResult {
  count: number | null;
}

/** 'CountBirthdaysForFriend' query type */
export interface ICountBirthdaysForFriendQuery {
  params: ICountBirthdaysForFriendParams;
  result: ICountBirthdaysForFriendResult;
}

const countBirthdaysForFriendIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":191}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":229}]}],"statement":"SELECT COUNT(*)::int as count\nFROM friends.friend_dates d\nINNER JOIN friends.friends c ON d.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND d.date_type = 'birthday'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::int as count
 * FROM friends.friend_dates d
 * INNER JOIN friends.friends c ON d.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND d.date_type = 'birthday'
 * ```
 */
export const countBirthdaysForFriend = new PreparedQuery<ICountBirthdaysForFriendParams,ICountBirthdaysForFriendResult>(countBirthdaysForFriendIR);


/** 'GetUpcomingDates' parameters type */
export interface IGetUpcomingDatesParams {
  limitCount?: NumberOrString | null | void;
  maxDays?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUpcomingDates' return type */
export interface IGetUpcomingDatesResult {
  /** Public UUID for API exposure */
  date_external_id: string;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  days_until: number | null;
  /** Primary name shown in lists */
  friend_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  friend_external_id: string;
  /** URL to 200x200 thumbnail */
  friend_photo_thumbnail_url: string | null;
  /** User-defined label (especially for "other" type) */
  label: string | null;
  /** Whether the year is known (false = only month/day) */
  year_known: boolean;
}

/** 'GetUpcomingDates' query type */
export interface IGetUpcomingDatesQuery {
  params: IGetUpcomingDatesParams;
  result: IGetUpcomingDatesResult;
}

const getUpcomingDatesIR: any = {"usedParamSet":{"userExternalId":true,"maxDays":true,"limitCount":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":649,"b":663}]},{"name":"maxDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":2190,"b":2197}]},{"name":"limitCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":2254,"b":2264}]}],"statement":"WITH date_calc AS (\n    SELECT\n        d.external_id AS date_external_id,\n        d.date_value,\n        d.year_known,\n        d.date_type,\n        d.label,\n        c.external_id AS friend_external_id,\n        c.display_name AS friend_display_name,\n        c.photo_thumbnail_url AS friend_photo_thumbnail_url,\n        EXTRACT(MONTH FROM d.date_value)::int AS date_month,\n        EXTRACT(DAY FROM d.date_value)::int AS date_day,\n        EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year\n    FROM friends.friend_dates d\n    INNER JOIN friends.friends c ON d.friend_id = c.id\n    INNER JOIN auth.users u ON c.user_id = u.id\n    WHERE u.external_id = :userExternalId\n      AND c.deleted_at IS NULL\n),\nsafe_dates AS (\n    SELECT\n        dc.*,\n        -- Handle Feb 29 in non-leap years by using Feb 28\n        CASE\n            WHEN dc.date_month = 2 AND dc.date_day = 29\n                 AND NOT (dc.current_year % 4 = 0 AND (dc.current_year % 100 != 0 OR dc.current_year % 400 = 0))\n            THEN 28\n            ELSE dc.date_day\n        END AS safe_day_current,\n        CASE\n            WHEN dc.date_month = 2 AND dc.date_day = 29\n                 AND NOT ((dc.current_year + 1) % 4 = 0 AND ((dc.current_year + 1) % 100 != 0 OR (dc.current_year + 1) % 400 = 0))\n            THEN 28\n            ELSE dc.date_day\n        END AS safe_day_next\n    FROM date_calc dc\n),\nwith_days_until AS (\n    SELECT\n        sd.date_external_id,\n        sd.date_value,\n        sd.year_known,\n        sd.date_type,\n        sd.label,\n        sd.friend_external_id,\n        sd.friend_display_name,\n        sd.friend_photo_thumbnail_url,\n        CASE\n            WHEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) >= CURRENT_DATE\n            THEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) - CURRENT_DATE\n            ELSE MAKE_DATE(sd.current_year + 1, sd.date_month, sd.safe_day_next) - CURRENT_DATE\n        END AS days_until\n    FROM safe_dates sd\n)\nSELECT\n    date_external_id,\n    date_value,\n    year_known,\n    date_type,\n    label,\n    friend_external_id,\n    friend_display_name,\n    friend_photo_thumbnail_url,\n    days_until\nFROM with_days_until\nWHERE days_until <= :maxDays\nORDER BY days_until ASC, friend_display_name ASC\nLIMIT :limitCount"};

/**
 * Query generated from SQL:
 * ```
 * WITH date_calc AS (
 *     SELECT
 *         d.external_id AS date_external_id,
 *         d.date_value,
 *         d.year_known,
 *         d.date_type,
 *         d.label,
 *         c.external_id AS friend_external_id,
 *         c.display_name AS friend_display_name,
 *         c.photo_thumbnail_url AS friend_photo_thumbnail_url,
 *         EXTRACT(MONTH FROM d.date_value)::int AS date_month,
 *         EXTRACT(DAY FROM d.date_value)::int AS date_day,
 *         EXTRACT(YEAR FROM CURRENT_DATE)::int AS current_year
 *     FROM friends.friend_dates d
 *     INNER JOIN friends.friends c ON d.friend_id = c.id
 *     INNER JOIN auth.users u ON c.user_id = u.id
 *     WHERE u.external_id = :userExternalId
 *       AND c.deleted_at IS NULL
 * ),
 * safe_dates AS (
 *     SELECT
 *         dc.*,
 *         -- Handle Feb 29 in non-leap years by using Feb 28
 *         CASE
 *             WHEN dc.date_month = 2 AND dc.date_day = 29
 *                  AND NOT (dc.current_year % 4 = 0 AND (dc.current_year % 100 != 0 OR dc.current_year % 400 = 0))
 *             THEN 28
 *             ELSE dc.date_day
 *         END AS safe_day_current,
 *         CASE
 *             WHEN dc.date_month = 2 AND dc.date_day = 29
 *                  AND NOT ((dc.current_year + 1) % 4 = 0 AND ((dc.current_year + 1) % 100 != 0 OR (dc.current_year + 1) % 400 = 0))
 *             THEN 28
 *             ELSE dc.date_day
 *         END AS safe_day_next
 *     FROM date_calc dc
 * ),
 * with_days_until AS (
 *     SELECT
 *         sd.date_external_id,
 *         sd.date_value,
 *         sd.year_known,
 *         sd.date_type,
 *         sd.label,
 *         sd.friend_external_id,
 *         sd.friend_display_name,
 *         sd.friend_photo_thumbnail_url,
 *         CASE
 *             WHEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) >= CURRENT_DATE
 *             THEN MAKE_DATE(sd.current_year, sd.date_month, sd.safe_day_current) - CURRENT_DATE
 *             ELSE MAKE_DATE(sd.current_year + 1, sd.date_month, sd.safe_day_next) - CURRENT_DATE
 *         END AS days_until
 *     FROM safe_dates sd
 * )
 * SELECT
 *     date_external_id,
 *     date_value,
 *     year_known,
 *     date_type,
 *     label,
 *     friend_external_id,
 *     friend_display_name,
 *     friend_photo_thumbnail_url,
 *     days_until
 * FROM with_days_until
 * WHERE days_until <= :maxDays
 * ORDER BY days_until ASC, friend_display_name ASC
 * LIMIT :limitCount
 * ```
 */
export const getUpcomingDates = new PreparedQuery<IGetUpcomingDatesParams,IGetUpcomingDatesResult>(getUpcomingDatesIR);


