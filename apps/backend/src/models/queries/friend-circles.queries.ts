/** Types generated for queries found in "src/models/queries/friend-circles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'GetCirclesByFriendId' parameters type */
export interface IGetCirclesByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCirclesByFriendId' return type */
export interface IGetCirclesByFriendIdResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  name: string;
}

/** 'GetCirclesByFriendId' query type */
export interface IGetCirclesByFriendIdQuery {
  params: IGetCirclesByFriendIdParams;
  result: IGetCirclesByFriendIdResult;
}

const getCirclesByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":251,"b":267}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":291,"b":305}]}],"statement":"SELECT\n    c.external_id,\n    c.name,\n    c.color\nFROM friends.circles c\nINNER JOIN friends.friend_circles fc ON fc.circle_id = c.id\nINNER JOIN friends.friends f ON fc.friend_id = f.id\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nORDER BY c.sort_order ASC, c.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.name,
 *     c.color
 * FROM friends.circles c
 * INNER JOIN friends.friend_circles fc ON fc.circle_id = c.id
 * INNER JOIN friends.friends f ON fc.friend_id = f.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * ORDER BY c.sort_order ASC, c.name ASC
 * ```
 */
export const getCirclesByFriendId = new PreparedQuery<IGetCirclesByFriendIdParams,IGetCirclesByFriendIdResult>(getCirclesByFriendIdIR);


/** 'AddFriendToCircle' parameters type */
export interface IAddFriendToCircleParams {
  circleExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'AddFriendToCircle' return type */
export interface IAddFriendToCircleResult {
  circle_color: string | null;
  circle_external_id: string | null;
  circle_name: string | null;
}

/** 'AddFriendToCircle' query type */
export interface IAddFriendToCircleQuery {
  params: IAddFriendToCircleParams;
  result: IAddFriendToCircleResult;
}

const addFriendToCircleIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true,"circleExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":214,"b":230}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":268}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":308}]}],"statement":"INSERT INTO friends.friend_circles (friend_id, circle_id)\nSELECT f.id, c.id\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nINNER JOIN friends.circles c ON c.user_id = u.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.external_id = :circleExternalId\n  AND f.deleted_at IS NULL\nON CONFLICT (friend_id, circle_id) DO NOTHING\nRETURNING\n    (SELECT external_id FROM friends.circles WHERE id = circle_id) AS circle_external_id,\n    (SELECT name FROM friends.circles WHERE id = circle_id) AS circle_name,\n    (SELECT color FROM friends.circles WHERE id = circle_id) AS circle_color"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_circles (friend_id, circle_id)
 * SELECT f.id, c.id
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * INNER JOIN friends.circles c ON c.user_id = u.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.external_id = :circleExternalId
 *   AND f.deleted_at IS NULL
 * ON CONFLICT (friend_id, circle_id) DO NOTHING
 * RETURNING
 *     (SELECT external_id FROM friends.circles WHERE id = circle_id) AS circle_external_id,
 *     (SELECT name FROM friends.circles WHERE id = circle_id) AS circle_name,
 *     (SELECT color FROM friends.circles WHERE id = circle_id) AS circle_color
 * ```
 */
export const addFriendToCircle = new PreparedQuery<IAddFriendToCircleParams,IAddFriendToCircleResult>(addFriendToCircleIR);


/** 'RemoveFriendFromCircle' parameters type */
export interface IRemoveFriendFromCircleParams {
  circleExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'RemoveFriendFromCircle' return type */
export interface IRemoveFriendFromCircleResult {
  /** Internal sequential ID */
  id: number;
}

/** 'RemoveFriendFromCircle' query type */
export interface IRemoveFriendFromCircleQuery {
  params: IRemoveFriendFromCircleParams;
  result: IRemoveFriendFromCircleResult;
}

const removeFriendFromCircleIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true,"circleExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":231}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":269}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":309}]}],"statement":"DELETE FROM friends.friend_circles fc\nUSING friends.friends f, auth.users u, friends.circles c\nWHERE fc.friend_id = f.id\n  AND fc.circle_id = c.id\n  AND f.user_id = u.id\n  AND c.user_id = u.id\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.external_id = :circleExternalId\n  AND f.deleted_at IS NULL\nRETURNING fc.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_circles fc
 * USING friends.friends f, auth.users u, friends.circles c
 * WHERE fc.friend_id = f.id
 *   AND fc.circle_id = c.id
 *   AND f.user_id = u.id
 *   AND c.user_id = u.id
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.external_id = :circleExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING fc.id
 * ```
 */
export const removeFriendFromCircle = new PreparedQuery<IRemoveFriendFromCircleParams,IRemoveFriendFromCircleResult>(removeFriendFromCircleIR);


/** 'ClearFriendCircles' parameters type */
export interface IClearFriendCirclesParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearFriendCircles' return type */
export type IClearFriendCirclesResult = void;

/** 'ClearFriendCircles' query type */
export interface IClearFriendCirclesQuery {
  params: IClearFriendCirclesParams;
  result: IClearFriendCirclesResult;
}

const clearFriendCirclesIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":228,"b":244}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":282}]}],"statement":"-- Removes all circle assignments for a friend (used before setting new circles)\nDELETE FROM friends.friend_circles fc\nUSING friends.friends f, auth.users u\nWHERE fc.friend_id = f.id\n  AND f.user_id = u.id\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Removes all circle assignments for a friend (used before setting new circles)
 * DELETE FROM friends.friend_circles fc
 * USING friends.friends f, auth.users u
 * WHERE fc.friend_id = f.id
 *   AND f.user_id = u.id
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * ```
 */
export const clearFriendCircles = new PreparedQuery<IClearFriendCirclesParams,IClearFriendCirclesResult>(clearFriendCirclesIR);


/** 'SetFriendCircles' parameters type */
export interface ISetFriendCirclesParams {
  circleExternalIds?: stringArray | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SetFriendCircles' return type */
export type ISetFriendCirclesResult = void;

/** 'SetFriendCircles' query type */
export interface ISetFriendCirclesQuery {
  params: ISetFriendCirclesParams;
  result: ISetFriendCirclesResult;
}

const setFriendCirclesIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true,"circleExternalIds":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":306,"b":322}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":346,"b":360}]},{"name":"circleExternalIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":388,"b":405}]}],"statement":"-- Adds a friend to multiple circles at once (call ClearFriendCircles first to replace all)\nINSERT INTO friends.friend_circles (friend_id, circle_id)\nSELECT f.id, c.id\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nINNER JOIN friends.circles c ON c.user_id = u.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.external_id = ANY(:circleExternalIds::uuid[])\n  AND f.deleted_at IS NULL\nON CONFLICT (friend_id, circle_id) DO NOTHING"};

/**
 * Query generated from SQL:
 * ```
 * -- Adds a friend to multiple circles at once (call ClearFriendCircles first to replace all)
 * INSERT INTO friends.friend_circles (friend_id, circle_id)
 * SELECT f.id, c.id
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * INNER JOIN friends.circles c ON c.user_id = u.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.external_id = ANY(:circleExternalIds::uuid[])
 *   AND f.deleted_at IS NULL
 * ON CONFLICT (friend_id, circle_id) DO NOTHING
 * ```
 */
export const setFriendCircles = new PreparedQuery<ISetFriendCirclesParams,ISetFriendCirclesResult>(setFriendCirclesIR);


/** 'GetFriendIdsByCircle' parameters type */
export interface IGetFriendIdsByCircleParams {
  circleExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendIdsByCircle' return type */
export interface IGetFriendIdsByCircleResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetFriendIdsByCircle' query type */
export interface IGetFriendIdsByCircleQuery {
  params: IGetFriendIdsByCircleParams;
  result: IGetFriendIdsByCircleResult;
}

const getFriendIdsByCircleIR: any = {"usedParamSet":{"circleExternalId":true,"userExternalId":true},"params":[{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":269,"b":285}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":323}]}],"statement":"-- Gets all friend IDs in a circle (for faceted search)\nSELECT f.id\nFROM friends.friends f\nINNER JOIN friends.friend_circles fc ON fc.friend_id = f.id\nINNER JOIN friends.circles c ON fc.circle_id = c.id\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE c.external_id = :circleExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\n  AND f.archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets all friend IDs in a circle (for faceted search)
 * SELECT f.id
 * FROM friends.friends f
 * INNER JOIN friends.friend_circles fc ON fc.friend_id = f.id
 * INNER JOIN friends.circles c ON fc.circle_id = c.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE c.external_id = :circleExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 *   AND f.archived_at IS NULL
 * ```
 */
export const getFriendIdsByCircle = new PreparedQuery<IGetFriendIdsByCircleParams,IGetFriendIdsByCircleResult>(getFriendIdsByCircleIR);


/** 'GetCircleFacetCounts' parameters type */
export interface IGetCircleFacetCountsParams {
  userExternalId?: string | null | void;
}

/** 'GetCircleFacetCounts' return type */
export interface IGetCircleFacetCountsResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  count: number | null;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  label: string;
  /** Public UUID for API exposure (always use this in APIs) */
  value: string;
}

/** 'GetCircleFacetCounts' query type */
export interface IGetCircleFacetCountsQuery {
  params: IGetCircleFacetCountsParams;
  result: IGetCircleFacetCountsResult;
}

const getCircleFacetCountsIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":413,"b":427}]}],"statement":"-- Gets circle facet counts for search results\nSELECT\n    c.external_id AS value,\n    c.name AS label,\n    c.color,\n    COUNT(DISTINCT fc.friend_id)::int AS count\nFROM friends.circles c\nINNER JOIN auth.users u ON c.user_id = u.id\nLEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id\nLEFT JOIN friends.friends f ON fc.friend_id = f.id AND f.deleted_at IS NULL AND f.archived_at IS NULL\nWHERE u.external_id = :userExternalId\nGROUP BY c.id, c.external_id, c.name, c.color\nORDER BY c.sort_order ASC, c.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets circle facet counts for search results
 * SELECT
 *     c.external_id AS value,
 *     c.name AS label,
 *     c.color,
 *     COUNT(DISTINCT fc.friend_id)::int AS count
 * FROM friends.circles c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
 * LEFT JOIN friends.friends f ON fc.friend_id = f.id AND f.deleted_at IS NULL AND f.archived_at IS NULL
 * WHERE u.external_id = :userExternalId
 * GROUP BY c.id, c.external_id, c.name, c.color
 * ORDER BY c.sort_order ASC, c.name ASC
 * ```
 */
export const getCircleFacetCounts = new PreparedQuery<IGetCircleFacetCountsParams,IGetCircleFacetCountsResult>(getCircleFacetCountsIR);


