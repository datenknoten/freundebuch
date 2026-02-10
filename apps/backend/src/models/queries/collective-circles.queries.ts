/** Types generated for queries found in "src/models/queries/collective-circles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetCirclesByCollectiveId' parameters type */
export interface IGetCirclesByCollectiveIdParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCirclesByCollectiveId' return type */
export interface IGetCirclesByCollectiveIdResult {
  /** Hex color code (e.g., "#3B82F6") */
  circle_color: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  circle_external_id: string;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  circle_name: string;
  created_at: Date;
}

/** 'GetCirclesByCollectiveId' query type */
export interface IGetCirclesByCollectiveIdQuery {
  params: IGetCirclesByCollectiveIdParams;
  result: IGetCirclesByCollectiveIdResult;
}

const getCirclesByCollectiveIdIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":383}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":407,"b":421}]}],"statement":"SELECT\n    cr.external_id AS circle_external_id,\n    cr.name AS circle_name,\n    cr.color AS circle_color,\n    ccm.created_at\nFROM collectives.collective_circle_memberships ccm\nINNER JOIN collectives.collectives c ON ccm.collective_id = c.id\nINNER JOIN friends.circles cr ON ccm.circle_id = cr.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY cr.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     cr.external_id AS circle_external_id,
 *     cr.name AS circle_name,
 *     cr.color AS circle_color,
 *     ccm.created_at
 * FROM collectives.collective_circle_memberships ccm
 * INNER JOIN collectives.collectives c ON ccm.collective_id = c.id
 * INNER JOIN friends.circles cr ON ccm.circle_id = cr.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY cr.name ASC
 * ```
 */
export const getCirclesByCollectiveId = new PreparedQuery<IGetCirclesByCollectiveIdParams,IGetCirclesByCollectiveIdResult>(getCirclesByCollectiveIdIR);


/** 'AddToCircle' parameters type */
export interface IAddToCircleParams {
  circleExternalId?: string | null | void;
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'AddToCircle' return type */
export interface IAddToCircleResult {
  circle_external_id: string | null;
}

/** 'AddToCircle' query type */
export interface IAddToCircleQuery {
  params: IAddToCircleParams;
  result: IAddToCircleResult;
}

const addToCircleIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true,"circleExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":266,"b":286}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":310,"b":324}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":365}]}],"statement":"INSERT INTO collectives.collective_circle_memberships (\n    collective_id,\n    circle_id\n)\nSELECT\n    c.id,\n    cr.id\nFROM collectives.collectives c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN friends.circles cr ON cr.user_id = u.id\nWHERE c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND cr.external_id = :circleExternalId\n  AND c.deleted_at IS NULL\nON CONFLICT (collective_id, circle_id) DO NOTHING\nRETURNING (\n    SELECT cr2.external_id\n    FROM friends.circles cr2\n    WHERE cr2.id = collective_circle_memberships.circle_id\n) AS circle_external_id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO collectives.collective_circle_memberships (
 *     collective_id,
 *     circle_id
 * )
 * SELECT
 *     c.id,
 *     cr.id
 * FROM collectives.collectives c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN friends.circles cr ON cr.user_id = u.id
 * WHERE c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND cr.external_id = :circleExternalId
 *   AND c.deleted_at IS NULL
 * ON CONFLICT (collective_id, circle_id) DO NOTHING
 * RETURNING (
 *     SELECT cr2.external_id
 *     FROM friends.circles cr2
 *     WHERE cr2.id = collective_circle_memberships.circle_id
 * ) AS circle_external_id
 * ```
 */
export const addToCircle = new PreparedQuery<IAddToCircleParams,IAddToCircleResult>(addToCircleIR);


/** 'RemoveFromCircle' parameters type */
export interface IRemoveFromCircleParams {
  circleExternalId?: string | null | void;
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'RemoveFromCircle' return type */
export interface IRemoveFromCircleResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'RemoveFromCircle' query type */
export interface IRemoveFromCircleQuery {
  params: IRemoveFromCircleParams;
  result: IRemoveFromCircleResult;
}

const removeFromCircleIR: any = {"usedParamSet":{"collectiveExternalId":true,"userExternalId":true,"circleExternalId":true},"params":[{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":228,"b":248}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":272,"b":286}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":327}]}],"statement":"DELETE FROM collectives.collective_circle_memberships ccm\nUSING collectives.collectives c, auth.users u, friends.circles cr\nWHERE ccm.collective_id = c.id\n  AND c.user_id = u.id\n  AND ccm.circle_id = cr.id\n  AND c.external_id = :collectiveExternalId\n  AND u.external_id = :userExternalId\n  AND cr.external_id = :circleExternalId\n  AND c.deleted_at IS NULL\nRETURNING cr.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM collectives.collective_circle_memberships ccm
 * USING collectives.collectives c, auth.users u, friends.circles cr
 * WHERE ccm.collective_id = c.id
 *   AND c.user_id = u.id
 *   AND ccm.circle_id = cr.id
 *   AND c.external_id = :collectiveExternalId
 *   AND u.external_id = :userExternalId
 *   AND cr.external_id = :circleExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING cr.external_id
 * ```
 */
export const removeFromCircle = new PreparedQuery<IRemoveFromCircleParams,IRemoveFromCircleResult>(removeFromCircleIR);


/** 'GetAvailableCircles' parameters type */
export interface IGetAvailableCirclesParams {
  collectiveExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetAvailableCircles' return type */
export interface IGetAvailableCirclesResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  name: string;
}

/** 'GetAvailableCircles' query type */
export interface IGetAvailableCirclesQuery {
  params: IGetAvailableCirclesParams;
  result: IGetAvailableCirclesResult;
}

const getAvailableCirclesIR: any = {"usedParamSet":{"userExternalId":true,"collectiveExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":158}]},{"name":"collectiveExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":342,"b":362}]}],"statement":"SELECT\n    cr.external_id,\n    cr.name,\n    cr.color\nFROM friends.circles cr\nINNER JOIN auth.users u ON cr.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND NOT EXISTS (\n    SELECT 1\n    FROM collectives.collective_circle_memberships ccm\n    INNER JOIN collectives.collectives c ON ccm.collective_id = c.id\n    WHERE c.external_id = :collectiveExternalId\n      AND ccm.circle_id = cr.id\n      AND c.deleted_at IS NULL\n  )\nORDER BY cr.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     cr.external_id,
 *     cr.name,
 *     cr.color
 * FROM friends.circles cr
 * INNER JOIN auth.users u ON cr.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND NOT EXISTS (
 *     SELECT 1
 *     FROM collectives.collective_circle_memberships ccm
 *     INNER JOIN collectives.collectives c ON ccm.collective_id = c.id
 *     WHERE c.external_id = :collectiveExternalId
 *       AND ccm.circle_id = cr.id
 *       AND c.deleted_at IS NULL
 *   )
 * ORDER BY cr.name ASC
 * ```
 */
export const getAvailableCircles = new PreparedQuery<IGetAvailableCirclesParams,IGetAvailableCirclesResult>(getAvailableCirclesIR);


