/** Types generated for queries found in "src/models/queries/encounters.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetEncountersByUserId' parameters type */
export interface IGetEncountersByUserIdParams {
  friendExternalId?: string | null | void;
  fromDate?: DateOrString | null | void;
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  search?: string | null | void;
  toDate?: DateOrString | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEncountersByUserId' return type */
export interface IGetEncountersByUserIdResult {
  created_at: Date;
  /** Additional notes or description of the encounter */
  description: string | null;
  /** Date when the encounter occurred */
  encounter_date: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  friend_count: number | null;
  /** Free-text location description */
  location_text: string | null;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  title: string;
  updated_at: Date;
}

/** 'GetEncountersByUserId' query type */
export interface IGetEncountersByUserIdQuery {
  params: IGetEncountersByUserIdParams;
  result: IGetEncountersByUserIdResult;
}

const getEncountersByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"friendExternalId":true,"fromDate":true,"toDate":true,"search":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":347,"b":361}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":381,"b":397},{"a":605,"b":621}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":651,"b":659},{"a":702,"b":710}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":734,"b":740},{"a":783,"b":789}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":813,"b":819},{"a":863,"b":869},{"a":912,"b":918}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":1103,"b":1111}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1120,"b":1126}]}],"statement":"SELECT\n    e.external_id,\n    e.title,\n    e.encounter_date,\n    e.location_text,\n    e.description,\n    e.created_at,\n    e.updated_at,\n    COUNT(DISTINCT ef.id)::int AS friend_count\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nLEFT JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id\nWHERE u.external_id = :userExternalId::uuid\n  AND (\n    :friendExternalId::uuid IS NULL\n    OR EXISTS (\n      SELECT 1 FROM encounters.encounter_friends ef2\n      INNER JOIN friends.friends f ON ef2.friend_id = f.id\n      WHERE ef2.encounter_id = e.id\n        AND f.external_id = :friendExternalId::uuid\n    )\n  )\n  AND (\n    :fromDate::date IS NULL\n    OR e.encounter_date >= :fromDate::date\n  )\n  AND (\n    :toDate::date IS NULL\n    OR e.encounter_date <= :toDate::date\n  )\n  AND (\n    :search::text IS NULL\n    OR e.title ILIKE '%' || :search || '%'\n    OR e.description ILIKE '%' || :search || '%'\n  )\nGROUP BY e.id, e.external_id, e.title, e.encounter_date, e.location_text, e.description, e.created_at, e.updated_at\nORDER BY e.encounter_date DESC, e.created_at DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     e.external_id,
 *     e.title,
 *     e.encounter_date,
 *     e.location_text,
 *     e.description,
 *     e.created_at,
 *     e.updated_at,
 *     COUNT(DISTINCT ef.id)::int AS friend_count
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * LEFT JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
 * WHERE u.external_id = :userExternalId::uuid
 *   AND (
 *     :friendExternalId::uuid IS NULL
 *     OR EXISTS (
 *       SELECT 1 FROM encounters.encounter_friends ef2
 *       INNER JOIN friends.friends f ON ef2.friend_id = f.id
 *       WHERE ef2.encounter_id = e.id
 *         AND f.external_id = :friendExternalId::uuid
 *     )
 *   )
 *   AND (
 *     :fromDate::date IS NULL
 *     OR e.encounter_date >= :fromDate::date
 *   )
 *   AND (
 *     :toDate::date IS NULL
 *     OR e.encounter_date <= :toDate::date
 *   )
 *   AND (
 *     :search::text IS NULL
 *     OR e.title ILIKE '%' || :search || '%'
 *     OR e.description ILIKE '%' || :search || '%'
 *   )
 * GROUP BY e.id, e.external_id, e.title, e.encounter_date, e.location_text, e.description, e.created_at, e.updated_at
 * ORDER BY e.encounter_date DESC, e.created_at DESC
 * LIMIT :pageSize
 * OFFSET :offset
 * ```
 */
export const getEncountersByUserId = new PreparedQuery<IGetEncountersByUserIdParams,IGetEncountersByUserIdResult>(getEncountersByUserIdIR);


/** 'CountEncountersByUserId' parameters type */
export interface ICountEncountersByUserIdParams {
  friendExternalId?: string | null | void;
  fromDate?: DateOrString | null | void;
  search?: string | null | void;
  toDate?: DateOrString | null | void;
  userExternalId?: string | null | void;
}

/** 'CountEncountersByUserId' return type */
export interface ICountEncountersByUserIdResult {
  total_count: number | null;
}

/** 'CountEncountersByUserId' query type */
export interface ICountEncountersByUserIdQuery {
  params: ICountEncountersByUserIdParams;
  result: ICountEncountersByUserIdResult;
}

const countEncountersByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"friendExternalId":true,"fromDate":true,"toDate":true,"search":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":157}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":177,"b":193},{"a":398,"b":414}]},{"name":"fromDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":444,"b":452},{"a":495,"b":503}]},{"name":"toDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":527,"b":533},{"a":576,"b":582}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":606,"b":612},{"a":656,"b":662},{"a":705,"b":711}]}],"statement":"SELECT COUNT(DISTINCT e.id)::int AS total_count\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE u.external_id = :userExternalId::uuid\n  AND (\n    :friendExternalId::uuid IS NULL\n    OR EXISTS (\n      SELECT 1 FROM encounters.encounter_friends ef\n      INNER JOIN friends.friends f ON ef.friend_id = f.id\n      WHERE ef.encounter_id = e.id\n        AND f.external_id = :friendExternalId::uuid\n    )\n  )\n  AND (\n    :fromDate::date IS NULL\n    OR e.encounter_date >= :fromDate::date\n  )\n  AND (\n    :toDate::date IS NULL\n    OR e.encounter_date <= :toDate::date\n  )\n  AND (\n    :search::text IS NULL\n    OR e.title ILIKE '%' || :search || '%'\n    OR e.description ILIKE '%' || :search || '%'\n  )"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT e.id)::int AS total_count
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE u.external_id = :userExternalId::uuid
 *   AND (
 *     :friendExternalId::uuid IS NULL
 *     OR EXISTS (
 *       SELECT 1 FROM encounters.encounter_friends ef
 *       INNER JOIN friends.friends f ON ef.friend_id = f.id
 *       WHERE ef.encounter_id = e.id
 *         AND f.external_id = :friendExternalId::uuid
 *     )
 *   )
 *   AND (
 *     :fromDate::date IS NULL
 *     OR e.encounter_date >= :fromDate::date
 *   )
 *   AND (
 *     :toDate::date IS NULL
 *     OR e.encounter_date <= :toDate::date
 *   )
 *   AND (
 *     :search::text IS NULL
 *     OR e.title ILIKE '%' || :search || '%'
 *     OR e.description ILIKE '%' || :search || '%'
 *   )
 * ```
 */
export const countEncountersByUserId = new PreparedQuery<ICountEncountersByUserIdParams,ICountEncountersByUserIdResult>(countEncountersByUserIdIR);


/** 'GetEncounterById' parameters type */
export interface IGetEncounterByIdParams {
  encounterExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEncounterById' return type */
export interface IGetEncounterByIdResult {
  created_at: Date;
  /** Additional notes or description of the encounter */
  description: string | null;
  /** Date when the encounter occurred */
  encounter_date: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Free-text location description */
  location_text: string | null;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  title: string;
  updated_at: Date;
}

/** 'GetEncounterById' query type */
export interface IGetEncounterByIdQuery {
  params: IGetEncounterByIdParams;
  result: IGetEncounterByIdResult;
}

const getEncounterByIdIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":250}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":280,"b":294}]}],"statement":"SELECT\n    e.external_id,\n    e.title,\n    e.encounter_date,\n    e.location_text,\n    e.description,\n    e.created_at,\n    e.updated_at\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     e.external_id,
 *     e.title,
 *     e.encounter_date,
 *     e.location_text,
 *     e.description,
 *     e.created_at,
 *     e.updated_at
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * ```
 */
export const getEncounterById = new PreparedQuery<IGetEncounterByIdParams,IGetEncounterByIdResult>(getEncounterByIdIR);


/** 'GetEncounterFriends' parameters type */
export interface IGetEncounterFriendsParams {
  encounterExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEncounterFriends' return type */
export interface IGetEncounterFriendsResult {
  display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'GetEncounterFriends' query type */
export interface IGetEncounterFriendsQuery {
  params: IGetEncounterFriendsParams;
  result: IGetEncounterFriendsResult;
}

const getEncounterFriendsIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":346}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":376,"b":390}]}],"statement":"SELECT\n    f.external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url\nFROM friends.friends f\nINNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id\nINNER JOIN encounters.encounters e ON ef.encounter_id = e.id\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL\nORDER BY display_name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     f.external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url
 * FROM friends.friends f
 * INNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id
 * INNER JOIN encounters.encounters e ON ef.encounter_id = e.id
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ORDER BY display_name ASC
 * ```
 */
export const getEncounterFriends = new PreparedQuery<IGetEncounterFriendsParams,IGetEncounterFriendsResult>(getEncounterFriendsIR);


/** 'GetEncounterFriendsPreview' parameters type */
export interface IGetEncounterFriendsPreviewParams {
  encounterExternalId?: string | null | void;
  limit?: NumberOrString | null | void;
}

/** 'GetEncounterFriendsPreview' return type */
export interface IGetEncounterFriendsPreviewResult {
  display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'GetEncounterFriendsPreview' query type */
export interface IGetEncounterFriendsPreviewQuery {
  params: IGetEncounterFriendsPreviewParams;
  result: IGetEncounterFriendsPreviewResult;
}

const getEncounterFriendsPreviewIR: any = {"usedParamSet":{"encounterExternalId":true,"limit":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":324,"b":343}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":410,"b":415}]}],"statement":"-- Gets first N friends for list preview\nSELECT\n    f.external_id,\n    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,\n    f.photo_url\nFROM friends.friends f\nINNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id\nINNER JOIN encounters.encounters e ON ef.encounter_id = e.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND f.deleted_at IS NULL\nORDER BY display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets first N friends for list preview
 * SELECT
 *     f.external_id,
 *     COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
 *     f.photo_url
 * FROM friends.friends f
 * INNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id
 * INNER JOIN encounters.encounters e ON ef.encounter_id = e.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ORDER BY display_name ASC
 * LIMIT :limit
 * ```
 */
export const getEncounterFriendsPreview = new PreparedQuery<IGetEncounterFriendsPreviewParams,IGetEncounterFriendsPreviewResult>(getEncounterFriendsPreviewIR);


/** 'CreateEncounter' parameters type */
export interface ICreateEncounterParams {
  description?: string | null | void;
  encounterDate?: DateOrString | null | void;
  locationText?: string | null | void;
  title?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateEncounter' return type */
export interface ICreateEncounterResult {
  created_at: Date;
  /** Additional notes or description of the encounter */
  description: string | null;
  /** Date when the encounter occurred */
  encounter_date: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Free-text location description */
  location_text: string | null;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  title: string;
  updated_at: Date;
}

/** 'CreateEncounter' query type */
export interface ICreateEncounterQuery {
  params: ICreateEncounterParams;
  result: ICreateEncounterResult;
}

const createEncounterIR: any = {"usedParamSet":{"title":true,"encounterDate":true,"locationText":true,"description":true,"userExternalId":true},"params":[{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":138,"b":143}]},{"name":"encounterDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":150,"b":163}]},{"name":"locationText","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":188}]},{"name":"description","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":206}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":248,"b":262}]}],"statement":"INSERT INTO encounters.encounters (\n    user_id,\n    title,\n    encounter_date,\n    location_text,\n    description\n)\nSELECT\n    u.id,\n    :title,\n    :encounterDate::date,\n    :locationText,\n    :description\nFROM auth.users u\nWHERE u.external_id = :userExternalId::uuid\nRETURNING\n    external_id,\n    title,\n    encounter_date,\n    location_text,\n    description,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO encounters.encounters (
 *     user_id,
 *     title,
 *     encounter_date,
 *     location_text,
 *     description
 * )
 * SELECT
 *     u.id,
 *     :title,
 *     :encounterDate::date,
 *     :locationText,
 *     :description
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId::uuid
 * RETURNING
 *     external_id,
 *     title,
 *     encounter_date,
 *     location_text,
 *     description,
 *     created_at,
 *     updated_at
 * ```
 */
export const createEncounter = new PreparedQuery<ICreateEncounterParams,ICreateEncounterResult>(createEncounterIR);


/** 'UpdateEncounter' parameters type */
export interface IUpdateEncounterParams {
  description?: string | null | void;
  encounterDate?: DateOrString | null | void;
  encounterExternalId?: string | null | void;
  locationText?: string | null | void;
  title?: string | null | void;
  updateDescription?: boolean | null | void;
  updateLocationText?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateEncounter' return type */
export interface IUpdateEncounterResult {
  created_at: Date;
  /** Additional notes or description of the encounter */
  description: string | null;
  /** Date when the encounter occurred */
  encounter_date: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Free-text location description */
  location_text: string | null;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  title: string;
  updated_at: Date;
}

/** 'UpdateEncounter' query type */
export interface IUpdateEncounterQuery {
  params: IUpdateEncounterParams;
  result: IUpdateEncounterResult;
}

const updateEncounterIR: any = {"usedParamSet":{"title":true,"encounterDate":true,"updateLocationText":true,"locationText":true,"updateDescription":true,"description":true,"encounterExternalId":true,"userExternalId":true},"params":[{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":56,"b":61}]},{"name":"encounterDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":104,"b":117}]},{"name":"updateLocationText","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":201}]},{"name":"locationText","required":false,"transform":{"type":"scalar"},"locs":[{"a":224,"b":236}]},{"name":"updateDescription","required":false,"transform":{"type":"scalar"},"locs":[{"a":312,"b":329}]},{"name":"description","required":false,"transform":{"type":"scalar"},"locs":[{"a":352,"b":363}]},{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":476,"b":495}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":548,"b":562}]}],"statement":"UPDATE encounters.encounters e\nSET\n    title = COALESCE(:title, e.title),\n    encounter_date = COALESCE(:encounterDate::date, e.encounter_date),\n    location_text = CASE\n        WHEN :updateLocationText::boolean = true THEN :locationText\n        ELSE e.location_text\n    END,\n    description = CASE\n        WHEN :updateDescription::boolean = true THEN :description\n        ELSE e.description\n    END,\n    updated_at = current_timestamp\nFROM auth.users u\nWHERE e.external_id = :encounterExternalId::uuid\n  AND e.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING\n    e.external_id,\n    e.title,\n    e.encounter_date,\n    e.location_text,\n    e.description,\n    e.created_at,\n    e.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE encounters.encounters e
 * SET
 *     title = COALESCE(:title, e.title),
 *     encounter_date = COALESCE(:encounterDate::date, e.encounter_date),
 *     location_text = CASE
 *         WHEN :updateLocationText::boolean = true THEN :locationText
 *         ELSE e.location_text
 *     END,
 *     description = CASE
 *         WHEN :updateDescription::boolean = true THEN :description
 *         ELSE e.description
 *     END,
 *     updated_at = current_timestamp
 * FROM auth.users u
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND e.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 * RETURNING
 *     e.external_id,
 *     e.title,
 *     e.encounter_date,
 *     e.location_text,
 *     e.description,
 *     e.created_at,
 *     e.updated_at
 * ```
 */
export const updateEncounter = new PreparedQuery<IUpdateEncounterParams,IUpdateEncounterResult>(updateEncounterIR);


/** 'DeleteEncounter' parameters type */
export interface IDeleteEncounterParams {
  encounterExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteEncounter' return type */
export interface IDeleteEncounterResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteEncounter' query type */
export interface IDeleteEncounterQuery {
  params: IDeleteEncounterParams;
  result: IDeleteEncounterResult;
}

const deleteEncounterIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":77,"b":96}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":149,"b":163}]}],"statement":"DELETE FROM encounters.encounters e\nUSING auth.users u\nWHERE e.external_id = :encounterExternalId::uuid\n  AND e.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING e.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM encounters.encounters e
 * USING auth.users u
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND e.user_id = u.id
 *   AND u.external_id = :userExternalId::uuid
 * RETURNING e.external_id
 * ```
 */
export const deleteEncounter = new PreparedQuery<IDeleteEncounterParams,IDeleteEncounterResult>(deleteEncounterIR);


/** 'GetLastEncounterForFriend' parameters type */
export interface IGetLastEncounterForFriendParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetLastEncounterForFriend' return type */
export interface IGetLastEncounterForFriendResult {
  /** Date when the encounter occurred */
  encounter_date: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  title: string;
}

/** 'GetLastEncounterForFriend' query type */
export interface IGetLastEncounterForFriendQuery {
  params: IGetLastEncounterForFriendParams;
  result: IGetLastEncounterForFriendResult;
}

const getLastEncounterForFriendIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":276,"b":292}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":336}]}],"statement":"SELECT\n    e.external_id,\n    e.title,\n    e.encounter_date\nFROM encounters.encounters e\nINNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id\nINNER JOIN friends.friends f ON ef.friend_id = f.id\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE f.external_id = :friendExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL\nORDER BY e.encounter_date DESC, e.created_at DESC\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     e.external_id,
 *     e.title,
 *     e.encounter_date
 * FROM encounters.encounters e
 * INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
 * INNER JOIN friends.friends f ON ef.friend_id = f.id
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE f.external_id = :friendExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ORDER BY e.encounter_date DESC, e.created_at DESC
 * LIMIT 1
 * ```
 */
export const getLastEncounterForFriend = new PreparedQuery<IGetLastEncounterForFriendParams,IGetLastEncounterForFriendResult>(getLastEncounterForFriendIR);


/** 'GetEncounterInternalId' parameters type */
export interface IGetEncounterInternalIdParams {
  encounterExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetEncounterInternalId' return type */
export interface IGetEncounterInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetEncounterInternalId' query type */
export interface IGetEncounterInternalIdQuery {
  params: IGetEncounterInternalIdParams;
  result: IGetEncounterInternalIdResult;
}

const getEncounterInternalIdIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":172}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":216}]}],"statement":"-- Helper to get internal ID for an encounter\nSELECT e.id\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Helper to get internal ID for an encounter
 * SELECT e.id
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * ```
 */
export const getEncounterInternalId = new PreparedQuery<IGetEncounterInternalIdParams,IGetEncounterInternalIdResult>(getEncounterInternalIdIR);


