/** Types generated for queries found in "src/models/queries/friend-professional-history.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetProfessionalHistoryByFriendId' parameters type */
export interface IGetProfessionalHistoryByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetProfessionalHistoryByFriendId' return type */
export interface IGetProfessionalHistoryByFriendIdResult {
  /** When this record was created */
  created_at: Date;
  /** Department within the organization */
  department: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Start month (1-12) */
  from_month: number;
  /** Start year */
  from_year: number;
  /** Whether this is the primary employment (shown in CardDAV) */
  is_primary: boolean;
  /** Job title/position */
  job_title: string | null;
  /** Additional notes about this position */
  notes: string | null;
  /** Company or organization name */
  organization: string | null;
  /** End month (1-12), NULL for current position */
  to_month: number | null;
  /** End year, NULL for current position */
  to_year: number | null;
}

/** 'GetProfessionalHistoryByFriendId' query type */
export interface IGetProfessionalHistoryByFriendIdQuery {
  params: IGetProfessionalHistoryByFriendIdParams;
  result: IGetProfessionalHistoryByFriendIdResult;
}

const getProfessionalHistoryByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":384}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":408,"b":422}]}],"statement":"SELECT\n    ph.external_id,\n    ph.job_title,\n    ph.organization,\n    ph.department,\n    ph.notes,\n    ph.from_month,\n    ph.from_year,\n    ph.to_month,\n    ph.to_year,\n    ph.is_primary,\n    ph.created_at\nFROM friends.friend_professional_history ph\nINNER JOIN friends.friends f ON ph.friend_id = f.id\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nORDER BY ph.is_primary DESC, ph.to_year IS NULL DESC, ph.from_year DESC, ph.from_month DESC, ph.created_at DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     ph.external_id,
 *     ph.job_title,
 *     ph.organization,
 *     ph.department,
 *     ph.notes,
 *     ph.from_month,
 *     ph.from_year,
 *     ph.to_month,
 *     ph.to_year,
 *     ph.is_primary,
 *     ph.created_at
 * FROM friends.friend_professional_history ph
 * INNER JOIN friends.friends f ON ph.friend_id = f.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * ORDER BY ph.is_primary DESC, ph.to_year IS NULL DESC, ph.from_year DESC, ph.from_month DESC, ph.created_at DESC
 * ```
 */
export const getProfessionalHistoryByFriendId = new PreparedQuery<IGetProfessionalHistoryByFriendIdParams,IGetProfessionalHistoryByFriendIdResult>(getProfessionalHistoryByFriendIdIR);


/** 'GetProfessionalHistoryById' parameters type */
export interface IGetProfessionalHistoryByIdParams {
  friendExternalId?: string | null | void;
  historyExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetProfessionalHistoryById' return type */
export interface IGetProfessionalHistoryByIdResult {
  /** When this record was created */
  created_at: Date;
  /** Department within the organization */
  department: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Start month (1-12) */
  from_month: number;
  /** Start year */
  from_year: number;
  /** Whether this is the primary employment (shown in CardDAV) */
  is_primary: boolean;
  /** Job title/position */
  job_title: string | null;
  /** Additional notes about this position */
  notes: string | null;
  /** Company or organization name */
  organization: string | null;
  /** End month (1-12), NULL for current position */
  to_month: number | null;
  /** End year, NULL for current position */
  to_year: number | null;
}

/** 'GetProfessionalHistoryById' query type */
export interface IGetProfessionalHistoryByIdQuery {
  params: IGetProfessionalHistoryByIdParams;
  result: IGetProfessionalHistoryByIdResult;
}

const getProfessionalHistoryByIdIR: any = {"usedParamSet":{"historyExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"historyExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":369,"b":386}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":410,"b":426}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":464}]}],"statement":"SELECT\n    ph.external_id,\n    ph.job_title,\n    ph.organization,\n    ph.department,\n    ph.notes,\n    ph.from_month,\n    ph.from_year,\n    ph.to_month,\n    ph.to_year,\n    ph.is_primary,\n    ph.created_at\nFROM friends.friend_professional_history ph\nINNER JOIN friends.friends f ON ph.friend_id = f.id\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE ph.external_id = :historyExternalId\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     ph.external_id,
 *     ph.job_title,
 *     ph.organization,
 *     ph.department,
 *     ph.notes,
 *     ph.from_month,
 *     ph.from_year,
 *     ph.to_month,
 *     ph.to_year,
 *     ph.is_primary,
 *     ph.created_at
 * FROM friends.friend_professional_history ph
 * INNER JOIN friends.friends f ON ph.friend_id = f.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE ph.external_id = :historyExternalId
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getProfessionalHistoryById = new PreparedQuery<IGetProfessionalHistoryByIdParams,IGetProfessionalHistoryByIdResult>(getProfessionalHistoryByIdIR);


/** 'CreateProfessionalHistory' parameters type */
export interface ICreateProfessionalHistoryParams {
  department?: string | null | void;
  friendExternalId?: string | null | void;
  fromMonth?: number | null | void;
  fromYear?: number | null | void;
  isPrimary?: boolean | null | void;
  jobTitle?: string | null | void;
  notes?: string | null | void;
  organization?: string | null | void;
  toMonth?: number | null | void;
  toYear?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateProfessionalHistory' return type */
export interface ICreateProfessionalHistoryResult {
  /** When this record was created */
  created_at: Date;
  /** Department within the organization */
  department: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Start month (1-12) */
  from_month: number;
  /** Start year */
  from_year: number;
  /** Whether this is the primary employment (shown in CardDAV) */
  is_primary: boolean;
  /** Job title/position */
  job_title: string | null;
  /** Additional notes about this position */
  notes: string | null;
  /** Company or organization name */
  organization: string | null;
  /** End month (1-12), NULL for current position */
  to_month: number | null;
  /** End year, NULL for current position */
  to_year: number | null;
}

/** 'CreateProfessionalHistory' query type */
export interface ICreateProfessionalHistoryQuery {
  params: ICreateProfessionalHistoryParams;
  result: ICreateProfessionalHistoryResult;
}

const createProfessionalHistoryIR: any = {"usedParamSet":{"jobTitle":true,"organization":true,"department":true,"notes":true,"fromMonth":true,"fromYear":true,"toMonth":true,"toYear":true,"isPrimary":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"jobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":229}]},{"name":"organization","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":248}]},{"name":"department","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":265}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":272,"b":277}]},{"name":"fromMonth","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":293}]},{"name":"fromYear","required":false,"transform":{"type":"scalar"},"locs":[{"a":310,"b":318}]},{"name":"toMonth","required":false,"transform":{"type":"scalar"},"locs":[{"a":335,"b":342}]},{"name":"toYear","required":false,"transform":{"type":"scalar"},"locs":[{"a":359,"b":365}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":382,"b":391}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":482,"b":498}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":522,"b":536}]}],"statement":"INSERT INTO friends.friend_professional_history (\n    friend_id,\n    job_title,\n    organization,\n    department,\n    notes,\n    from_month,\n    from_year,\n    to_month,\n    to_year,\n    is_primary\n)\nSELECT\n    f.id,\n    :jobTitle,\n    :organization,\n    :department,\n    :notes,\n    :fromMonth::smallint,\n    :fromYear::smallint,\n    :toMonth::smallint,\n    :toYear::smallint,\n    :isPrimary\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING\n    external_id,\n    job_title,\n    organization,\n    department,\n    notes,\n    from_month,\n    from_year,\n    to_month,\n    to_year,\n    is_primary,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_professional_history (
 *     friend_id,
 *     job_title,
 *     organization,
 *     department,
 *     notes,
 *     from_month,
 *     from_year,
 *     to_month,
 *     to_year,
 *     is_primary
 * )
 * SELECT
 *     f.id,
 *     :jobTitle,
 *     :organization,
 *     :department,
 *     :notes,
 *     :fromMonth::smallint,
 *     :fromYear::smallint,
 *     :toMonth::smallint,
 *     :toYear::smallint,
 *     :isPrimary
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     job_title,
 *     organization,
 *     department,
 *     notes,
 *     from_month,
 *     from_year,
 *     to_month,
 *     to_year,
 *     is_primary,
 *     created_at
 * ```
 */
export const createProfessionalHistory = new PreparedQuery<ICreateProfessionalHistoryParams,ICreateProfessionalHistoryResult>(createProfessionalHistoryIR);


/** 'UpdateProfessionalHistory' parameters type */
export interface IUpdateProfessionalHistoryParams {
  department?: string | null | void;
  friendExternalId?: string | null | void;
  fromMonth?: number | null | void;
  fromYear?: number | null | void;
  historyExternalId?: string | null | void;
  isPrimary?: boolean | null | void;
  jobTitle?: string | null | void;
  notes?: string | null | void;
  organization?: string | null | void;
  toMonth?: number | null | void;
  toYear?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateProfessionalHistory' return type */
export interface IUpdateProfessionalHistoryResult {
  /** When this record was created */
  created_at: Date;
  /** Department within the organization */
  department: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Start month (1-12) */
  from_month: number;
  /** Start year */
  from_year: number;
  /** Whether this is the primary employment (shown in CardDAV) */
  is_primary: boolean;
  /** Job title/position */
  job_title: string | null;
  /** Additional notes about this position */
  notes: string | null;
  /** Company or organization name */
  organization: string | null;
  /** End month (1-12), NULL for current position */
  to_month: number | null;
  /** End year, NULL for current position */
  to_year: number | null;
}

/** 'UpdateProfessionalHistory' query type */
export interface IUpdateProfessionalHistoryQuery {
  params: IUpdateProfessionalHistoryParams;
  result: IUpdateProfessionalHistoryResult;
}

const updateProfessionalHistoryIR: any = {"usedParamSet":{"jobTitle":true,"organization":true,"department":true,"notes":true,"fromMonth":true,"fromYear":true,"toMonth":true,"toYear":true,"isPrimary":true,"historyExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"jobTitle","required":false,"transform":{"type":"scalar"},"locs":[{"a":66,"b":74}]},{"name":"organization","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":108}]},{"name":"department","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":138}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":158}]},{"name":"fromMonth","required":false,"transform":{"type":"scalar"},"locs":[{"a":178,"b":187}]},{"name":"fromYear","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":224}]},{"name":"toMonth","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":259}]},{"name":"toYear","required":false,"transform":{"type":"scalar"},"locs":[{"a":286,"b":292}]},{"name":"isPrimary","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":331}]},{"name":"historyExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":423,"b":440}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":490,"b":506}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":530,"b":544}]}],"statement":"UPDATE friends.friend_professional_history ph\nSET\n    job_title = :jobTitle,\n    organization = :organization,\n    department = :department,\n    notes = :notes,\n    from_month = :fromMonth::smallint,\n    from_year = :fromYear::smallint,\n    to_month = :toMonth::smallint,\n    to_year = :toYear::smallint,\n    is_primary = :isPrimary\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE ph.external_id = :historyExternalId\n  AND ph.friend_id = f.id\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING\n    ph.external_id,\n    ph.job_title,\n    ph.organization,\n    ph.department,\n    ph.notes,\n    ph.from_month,\n    ph.from_year,\n    ph.to_month,\n    ph.to_year,\n    ph.is_primary,\n    ph.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_professional_history ph
 * SET
 *     job_title = :jobTitle,
 *     organization = :organization,
 *     department = :department,
 *     notes = :notes,
 *     from_month = :fromMonth::smallint,
 *     from_year = :fromYear::smallint,
 *     to_month = :toMonth::smallint,
 *     to_year = :toYear::smallint,
 *     is_primary = :isPrimary
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE ph.external_id = :historyExternalId
 *   AND ph.friend_id = f.id
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING
 *     ph.external_id,
 *     ph.job_title,
 *     ph.organization,
 *     ph.department,
 *     ph.notes,
 *     ph.from_month,
 *     ph.from_year,
 *     ph.to_month,
 *     ph.to_year,
 *     ph.is_primary,
 *     ph.created_at
 * ```
 */
export const updateProfessionalHistory = new PreparedQuery<IUpdateProfessionalHistoryParams,IUpdateProfessionalHistoryResult>(updateProfessionalHistoryIR);


/** 'DeleteProfessionalHistory' parameters type */
export interface IDeleteProfessionalHistoryParams {
  friendExternalId?: string | null | void;
  historyExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteProfessionalHistory' return type */
export interface IDeleteProfessionalHistoryResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteProfessionalHistory' query type */
export interface IDeleteProfessionalHistoryQuery {
  params: IDeleteProfessionalHistoryParams;
  result: IDeleteProfessionalHistoryResult;
}

const deleteProfessionalHistoryIR: any = {"usedParamSet":{"historyExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"historyExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":129}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":218}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":242,"b":256}]}],"statement":"DELETE FROM friends.friend_professional_history ph\nUSING friends.friends f, auth.users u\nWHERE ph.external_id = :historyExternalId\n  AND ph.friend_id = f.id\n  AND f.user_id = u.id\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING ph.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_professional_history ph
 * USING friends.friends f, auth.users u
 * WHERE ph.external_id = :historyExternalId
 *   AND ph.friend_id = f.id
 *   AND f.user_id = u.id
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING ph.external_id
 * ```
 */
export const deleteProfessionalHistory = new PreparedQuery<IDeleteProfessionalHistoryParams,IDeleteProfessionalHistoryResult>(deleteProfessionalHistoryIR);


/** 'ClearPrimaryProfessionalHistory' parameters type */
export interface IClearPrimaryProfessionalHistoryParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearPrimaryProfessionalHistory' return type */
export interface IClearPrimaryProfessionalHistoryResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'ClearPrimaryProfessionalHistory' query type */
export interface IClearPrimaryProfessionalHistoryQuery {
  params: IClearPrimaryProfessionalHistoryParams;
  result: IClearPrimaryProfessionalHistoryResult;
}

const clearPrimaryProfessionalHistoryIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":331,"b":347}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":385}]}],"statement":"-- Sets is_primary = false for all professional history entries for a friend\n-- Used before setting a new primary entry\nUPDATE friends.friend_professional_history ph\nSET is_primary = false\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE ph.friend_id = f.id\n  AND ph.is_primary = true\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING ph.external_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Sets is_primary = false for all professional history entries for a friend
 * -- Used before setting a new primary entry
 * UPDATE friends.friend_professional_history ph
 * SET is_primary = false
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE ph.friend_id = f.id
 *   AND ph.is_primary = true
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING ph.external_id
 * ```
 */
export const clearPrimaryProfessionalHistory = new PreparedQuery<IClearPrimaryProfessionalHistoryParams,IClearPrimaryProfessionalHistoryResult>(clearPrimaryProfessionalHistoryIR);


/** 'GetPrimaryProfessionalHistory' parameters type */
export interface IGetPrimaryProfessionalHistoryParams {
  friendId?: number | null | void;
}

/** 'GetPrimaryProfessionalHistory' return type */
export interface IGetPrimaryProfessionalHistoryResult {
  /** When this record was created */
  created_at: Date;
  /** Department within the organization */
  department: string | null;
  /** Public UUID for API exposure */
  external_id: string;
  /** Start month (1-12) */
  from_month: number;
  /** Start year */
  from_year: number;
  /** Whether this is the primary employment (shown in CardDAV) */
  is_primary: boolean;
  /** Job title/position */
  job_title: string | null;
  /** Additional notes about this position */
  notes: string | null;
  /** Company or organization name */
  organization: string | null;
  /** End month (1-12), NULL for current position */
  to_month: number | null;
  /** End year, NULL for current position */
  to_year: number | null;
}

/** 'GetPrimaryProfessionalHistory' query type */
export interface IGetPrimaryProfessionalHistoryQuery {
  params: IGetPrimaryProfessionalHistoryParams;
  result: IGetPrimaryProfessionalHistoryResult;
}

const getPrimaryProfessionalHistoryIR: any = {"usedParamSet":{"friendId":true},"params":[{"name":"friendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":395,"b":403}]}],"statement":"-- Get the primary professional history entry for a friend (for CardDAV/search)\nSELECT\n    ph.external_id,\n    ph.job_title,\n    ph.organization,\n    ph.department,\n    ph.notes,\n    ph.from_month,\n    ph.from_year,\n    ph.to_month,\n    ph.to_year,\n    ph.is_primary,\n    ph.created_at\nFROM friends.friend_professional_history ph\nINNER JOIN friends.friends f ON ph.friend_id = f.id\nWHERE f.id = :friendId\n  AND ph.is_primary = true\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- Get the primary professional history entry for a friend (for CardDAV/search)
 * SELECT
 *     ph.external_id,
 *     ph.job_title,
 *     ph.organization,
 *     ph.department,
 *     ph.notes,
 *     ph.from_month,
 *     ph.from_year,
 *     ph.to_month,
 *     ph.to_year,
 *     ph.is_primary,
 *     ph.created_at
 * FROM friends.friend_professional_history ph
 * INNER JOIN friends.friends f ON ph.friend_id = f.id
 * WHERE f.id = :friendId
 *   AND ph.is_primary = true
 * LIMIT 1
 * ```
 */
export const getPrimaryProfessionalHistory = new PreparedQuery<IGetPrimaryProfessionalHistoryParams,IGetPrimaryProfessionalHistoryResult>(getPrimaryProfessionalHistoryIR);


