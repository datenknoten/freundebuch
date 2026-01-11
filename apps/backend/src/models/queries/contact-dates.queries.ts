/** Types generated for queries found in "src/models/queries/contact-dates.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetDatesByContactId' parameters type */
export interface IGetDatesByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetDatesByContactId' return type */
export interface IGetDatesByContactIdResult {
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

/** 'GetDatesByContactId' query type */
export interface IGetDatesByContactIdQuery {
  params: IGetDatesByContactIdParams;
  result: IGetDatesByContactIdResult;
}

const getDatesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":276}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":314}]}],"statement":"SELECT\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at\nFROM contacts.contact_dates d\nINNER JOIN contacts.contacts c ON d.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY d.date_type ASC, d.created_at ASC"};

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
 * FROM contacts.contact_dates d
 * INNER JOIN contacts.contacts c ON d.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY d.date_type ASC, d.created_at ASC
 * ```
 */
export const getDatesByContactId = new PreparedQuery<IGetDatesByContactIdParams,IGetDatesByContactIdResult>(getDatesByContactIdIR);


/** 'GetDateById' parameters type */
export interface IGetDateByIdParams {
  contactExternalId?: string | null | void;
  dateExternalId?: string | null | void;
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

const getDateByIdIR: any = {"usedParamSet":{"dateExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":273}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":314}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":352}]}],"statement":"SELECT\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at\nFROM contacts.contact_dates d\nINNER JOIN contacts.contacts c ON d.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE d.external_id = :dateExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contacts.contact_dates d
 * INNER JOIN contacts.contacts c ON d.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE d.external_id = :dateExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getDateById = new PreparedQuery<IGetDateByIdParams,IGetDateByIdResult>(getDateByIdIR);


/** 'CreateDate' parameters type */
export interface ICreateDateParams {
  contactExternalId?: string | null | void;
  dateType?: string | null | void;
  dateValue?: DateOrString | null | void;
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

const createDateIR: any = {"usedParamSet":{"dateValue":true,"yearKnown":true,"dateType":true,"label":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"dateValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":133,"b":142}]},{"name":"yearKnown","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":164}]},{"name":"dateType","required":false,"transform":{"type":"scalar"},"locs":[{"a":171,"b":179}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":191}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":301}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":325,"b":339}]}],"statement":"INSERT INTO contacts.contact_dates (\n    contact_id,\n    date_value,\n    year_known,\n    date_type,\n    label\n)\nSELECT\n    c.id,\n    :dateValue::date,\n    :yearKnown,\n    :dateType,\n    :label\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    date_value,\n    year_known,\n    date_type,\n    label,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_dates (
 *     contact_id,
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
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
  dateExternalId?: string | null | void;
  dateType?: string | null | void;
  dateValue?: DateOrString | null | void;
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

const updateDateIR: any = {"usedParamSet":{"dateValue":true,"yearKnown":true,"dateType":true,"label":true,"dateExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"dateValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":53,"b":62}]},{"name":"yearKnown","required":false,"transform":{"type":"scalar"},"locs":[{"a":88,"b":97}]},{"name":"dateType","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":124}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":144}]},{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":237,"b":251}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":301,"b":318}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":342,"b":356}]}],"statement":"UPDATE contacts.contact_dates d\nSET\n    date_value = :dateValue::date,\n    year_known = :yearKnown,\n    date_type = :dateType,\n    label = :label\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE d.external_id = :dateExternalId\n  AND d.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    d.external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    d.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_dates d
 * SET
 *     date_value = :dateValue::date,
 *     year_known = :yearKnown,
 *     date_type = :dateType,
 *     label = :label
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE d.external_id = :dateExternalId
 *   AND d.contact_id = c.id
 *   AND c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
  dateExternalId?: string | null | void;
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

const deleteDateIR: any = {"usedParamSet":{"dateExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"dateExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":113}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":203}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":227,"b":241}]}],"statement":"DELETE FROM contacts.contact_dates d\nUSING contacts.contacts c, auth.users u\nWHERE d.external_id = :dateExternalId\n  AND d.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING d.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_dates d
 * USING contacts.contacts c, auth.users u
 * WHERE d.external_id = :dateExternalId
 *   AND d.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING d.external_id
 * ```
 */
export const deleteDate = new PreparedQuery<IDeleteDateParams,IDeleteDateResult>(deleteDateIR);


/** 'CountBirthdaysForContact' parameters type */
export interface ICountBirthdaysForContactParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CountBirthdaysForContact' return type */
export interface ICountBirthdaysForContactResult {
  count: number | null;
}

/** 'CountBirthdaysForContact' query type */
export interface ICountBirthdaysForContactQuery {
  params: ICountBirthdaysForContactParams;
  result: ICountBirthdaysForContactResult;
}

const countBirthdaysForContactIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":197}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":235}]}],"statement":"SELECT COUNT(*)::int as count\nFROM contacts.contact_dates d\nINNER JOIN contacts.contacts c ON d.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND d.date_type = 'birthday'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::int as count
 * FROM contacts.contact_dates d
 * INNER JOIN contacts.contacts c ON d.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND d.date_type = 'birthday'
 * ```
 */
export const countBirthdaysForContact = new PreparedQuery<ICountBirthdaysForContactParams,ICountBirthdaysForContactResult>(countBirthdaysForContactIR);


/** 'GetUpcomingDates' parameters type */
export interface IGetUpcomingDatesParams {
  limitCount?: NumberOrString | null | void;
  maxDays?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'GetUpcomingDates' return type */
export interface IGetUpcomingDatesResult {
  /** Primary name shown in lists */
  contact_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  contact_external_id: string;
  /** URL to 200x200 thumbnail */
  contact_photo_thumbnail_url: string | null;
  /** Public UUID for API exposure */
  date_external_id: string;
  /** birthday, anniversary, or other */
  date_type: string;
  /** The date value */
  date_value: Date;
  days_until: number | null;
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

const getUpcomingDatesIR: any = {"usedParamSet":{"userExternalId":true,"maxDays":true,"limitCount":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":898,"b":912}]},{"name":"maxDays","required":false,"transform":{"type":"scalar"},"locs":[{"a":1426,"b":1433}]},{"name":"limitCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":1485,"b":1495}]}],"statement":"SELECT\n    d.external_id AS date_external_id,\n    d.date_value,\n    d.year_known,\n    d.date_type,\n    d.label,\n    c.external_id AS contact_external_id,\n    c.display_name AS contact_display_name,\n    c.photo_thumbnail_url AS contact_photo_thumbnail_url,\n    CASE\n        WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) >= CURRENT_DATE\n        THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE\n        ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE\n    END AS days_until\nFROM contacts.contact_dates d\nINNER JOIN contacts.contacts c ON d.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND CASE\n        WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) >= CURRENT_DATE\n        THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE\n        ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE\n      END <= :maxDays\nORDER BY days_until ASC, c.display_name ASC\nLIMIT :limitCount"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     d.external_id AS date_external_id,
 *     d.date_value,
 *     d.year_known,
 *     d.date_type,
 *     d.label,
 *     c.external_id AS contact_external_id,
 *     c.display_name AS contact_display_name,
 *     c.photo_thumbnail_url AS contact_photo_thumbnail_url,
 *     CASE
 *         WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) >= CURRENT_DATE
 *         THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE
 *         ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE
 *     END AS days_until
 * FROM contacts.contact_dates d
 * INNER JOIN contacts.contacts c ON d.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND CASE
 *         WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) >= CURRENT_DATE
 *         THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE
 *         ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM d.date_value)::int, EXTRACT(DAY FROM d.date_value)::int) - CURRENT_DATE
 *       END <= :maxDays
 * ORDER BY days_until ASC, c.display_name ASC
 * LIMIT :limitCount
 * ```
 */
export const getUpcomingDates = new PreparedQuery<IGetUpcomingDatesParams,IGetUpcomingDatesResult>(getUpcomingDatesIR);


