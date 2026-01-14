/** Types generated for queries found in "src/models/queries/circles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetCirclesByUserId' parameters type */
export interface IGetCirclesByUserIdParams {
  userExternalId?: string | null | void;
}

/** 'GetCirclesByUserId' return type */
export interface IGetCirclesByUserIdResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  friend_count: number | null;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  parent_circle_external_id: string;
  /** Custom sort order within parent level */
  sort_order: number;
  updated_at: Date;
}

/** 'GetCirclesByUserId' query type */
export interface IGetCirclesByUserIdQuery {
  params: IGetCirclesByUserIdParams;
  result: IGetCirclesByUserIdResult;
}

const getCirclesByUserIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":399,"b":413}]}],"statement":"SELECT\n    c.external_id,\n    c.name,\n    c.color,\n    pc.external_id AS parent_circle_external_id,\n    c.sort_order,\n    c.created_at,\n    c.updated_at,\n    COUNT(fc.id)::int AS friend_count\nFROM friends.circles c\nINNER JOIN auth.users u ON c.user_id = u.id\nLEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id\nLEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id\nWHERE u.external_id = :userExternalId::uuid\nGROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at\nORDER BY c.sort_order ASC, c.name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.name,
 *     c.color,
 *     pc.external_id AS parent_circle_external_id,
 *     c.sort_order,
 *     c.created_at,
 *     c.updated_at,
 *     COUNT(fc.id)::int AS friend_count
 * FROM friends.circles c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * LEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id
 * LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
 * WHERE u.external_id = :userExternalId
 * GROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at
 * ORDER BY c.sort_order ASC, c.name ASC
 * ```
 */
export const getCirclesByUserId = new PreparedQuery<IGetCirclesByUserIdParams,IGetCirclesByUserIdResult>(getCirclesByUserIdIR);


/** 'GetCircleById' parameters type */
export interface IGetCircleByIdParams {
  circleExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCircleById' return type */
export interface IGetCircleByIdResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  friend_count: number | null;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  parent_circle_external_id: string;
  /** Custom sort order within parent level */
  sort_order: number;
  updated_at: Date;
}

/** 'GetCircleById' query type */
export interface IGetCircleByIdQuery {
  params: IGetCircleByIdParams;
  result: IGetCircleByIdResult;
}

const getCircleByIdIR: any = {"usedParamSet":{"circleExternalId":true,"userExternalId":true},"params":[{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":399,"b":415}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":445,"b":459}]}],"statement":"SELECT\n    c.external_id,\n    c.name,\n    c.color,\n    pc.external_id AS parent_circle_external_id,\n    c.sort_order,\n    c.created_at,\n    c.updated_at,\n    COUNT(fc.id)::int AS friend_count\nFROM friends.circles c\nINNER JOIN auth.users u ON c.user_id = u.id\nLEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id\nLEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id\nWHERE c.external_id = :circleExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\nGROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.name,
 *     c.color,
 *     pc.external_id AS parent_circle_external_id,
 *     c.sort_order,
 *     c.created_at,
 *     c.updated_at,
 *     COUNT(fc.id)::int AS friend_count
 * FROM friends.circles c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * LEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id
 * LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
 * WHERE c.external_id = :circleExternalId
 *   AND u.external_id = :userExternalId
 * GROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at
 * ```
 */
export const getCircleById = new PreparedQuery<IGetCircleByIdParams,IGetCircleByIdResult>(getCircleByIdIR);


/** 'CreateCircle' parameters type */
export interface ICreateCircleParams {
  color?: string | null | void;
  name?: string | null | void;
  parentCircleExternalId?: string | null | void;
  sortOrder?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateCircle' return type */
export interface ICreateCircleResult {
  /** Hex color code (e.g., "#3B82F6") */
  color: string | null;
  created_at: Date;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** Circle name (e.g., "Work", "Family", "Book Club") */
  name: string;
  parent_circle_external_id: string | null;
  /** Custom sort order within parent level */
  sort_order: number;
  updated_at: Date;
}

/** 'CreateCircle' query type */
export interface ICreateCircleQuery {
  params: ICreateCircleParams;
  result: ICreateCircleResult;
}

const createCircleIR: any = {"usedParamSet":{"name":true,"color":true,"sortOrder":true,"parentCircleExternalId":true,"userExternalId":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":124,"b":128}]},{"name":"color","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":140}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":167,"b":176}]},{"name":"parentCircleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":271}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":337}]}],"statement":"INSERT INTO friends.circles (\n    user_id,\n    name,\n    color,\n    parent_circle_id,\n    sort_order\n)\nSELECT\n    u.id,\n    :name,\n    :color,\n    pc.id,\n    COALESCE(:sortOrder, 0)\nFROM auth.users u\nLEFT JOIN friends.circles pc ON pc.external_id = :parentCircleExternalId::uuid AND pc.user_id = u.id\nWHERE u.external_id = :userExternalId::uuid\nRETURNING\n    external_id,\n    name,\n    color,\n    (SELECT external_id FROM friends.circles WHERE id = parent_circle_id) AS parent_circle_external_id,\n    sort_order,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.circles (
 *     user_id,
 *     name,
 *     color,
 *     parent_circle_id,
 *     sort_order
 * )
 * SELECT
 *     u.id,
 *     :name,
 *     :color,
 *     pc.id,
 *     COALESCE(:sortOrder, 0)
 * FROM auth.users u
 * LEFT JOIN friends.circles pc ON pc.external_id = :parentCircleExternalId AND pc.user_id = u.id
 * WHERE u.external_id = :userExternalId
 * RETURNING
 *     external_id,
 *     name,
 *     color,
 *     (SELECT external_id FROM friends.circles WHERE id = parent_circle_id) AS parent_circle_external_id,
 *     sort_order,
 *     created_at,
 *     updated_at
 * ```
 */
export const createCircle = new PreparedQuery<ICreateCircleParams,ICreateCircleResult>(createCircleIR);


/** 'UpdateCircle' parameters type */
export interface IUpdateCircleParams {
  circleExternalId?: string | null | void;
  color?: string | null | void;
  name?: string | null | void;
  parentCircleExternalId?: string | null | void;
  sortOrder?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateCircle' return type */
export interface IUpdateCircleResult {
  color: string | null;
  created_at: Date;
  external_id: string;
  name: string;
  parent_circle_external_id: string | null;
  sort_order: number;
  updated_at: Date;
}

const updateCircleIR: any = {"usedParamSet":{"name":true,"color":true,"parentCircleExternalId":true,"sortOrder":true,"circleExternalId":true,"userExternalId":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":146,"b":150}]},{"name":"color","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":188}]},{"name":"parentCircleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":242,"b":264},{"a":316,"b":338},{"a":464,"b":486}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":594,"b":603}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":696,"b":712}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":765,"b":779}]}],"statement":"-- Note: parentCircleExternalId = '__KEEP__' means don't change parent, NULL means remove parent\nUPDATE friends.circles c\nSET\n    name = COALESCE(:name, c.name),\n    color = COALESCE(:color, c.color),\n    parent_circle_id = CASE\n        WHEN :parentCircleExternalId = '__KEEP__' THEN c.parent_circle_id\n        WHEN :parentCircleExternalId IS NULL THEN NULL\n        ELSE (\n            SELECT pc.id FROM friends.circles pc\n            WHERE pc.external_id = NULLIF(:parentCircleExternalId, '__KEEP__')::uuid\n              AND pc.user_id = c.user_id\n        )\n    END,\n    sort_order = COALESCE(:sortOrder, c.sort_order),\n    updated_at = current_timestamp\nFROM auth.users u\nWHERE c.external_id = :circleExternalId::uuid\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING\n    c.external_id,\n    c.name,\n    c.color,\n    (SELECT pc.external_id FROM friends.circles pc WHERE pc.id = c.parent_circle_id) AS parent_circle_external_id,\n    c.sort_order,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * -- Note: parentCircleExternalId = '__KEEP__' means don't change parent, NULL means remove parent
 * UPDATE friends.circles c
 * SET
 *     name = COALESCE(:name, c.name),
 *     color = COALESCE(:color, c.color),
 *     parent_circle_id = CASE
 *         WHEN :parentCircleExternalId = '__KEEP__' THEN c.parent_circle_id
 *         WHEN :parentCircleExternalId IS NULL THEN NULL
 *         ELSE (
 *             SELECT pc.id FROM friends.circles pc
 *             WHERE pc.external_id = :parentCircleExternalId
 *               AND pc.user_id = c.user_id
 *         )
 *     END,
 *     sort_order = COALESCE(:sortOrder, c.sort_order),
 *     updated_at = current_timestamp
 * FROM auth.users u
 * WHERE c.external_id = :circleExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 * RETURNING
 *     c.external_id,
 *     c.name,
 *     c.color,
 *     (SELECT pc.external_id FROM friends.circles pc WHERE pc.id = c.parent_circle_id) AS parent_circle_external_id,
 *     c.sort_order,
 *     c.created_at,
 *     c.updated_at
 * ```
 */
export const updateCircle = new PreparedQuery<IUpdateCircleParams,IUpdateCircleResult>(updateCircleIR);


/** 'DeleteCircle' parameters type */
export interface IDeleteCircleParams {
  circleExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteCircle' return type */
export interface IDeleteCircleResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'DeleteCircle' query type */
export interface IDeleteCircleQuery {
  params: IDeleteCircleParams;
  result: IDeleteCircleResult;
}

const deleteCircleIR: any = {"usedParamSet":{"circleExternalId":true,"userExternalId":true},"params":[{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":71,"b":87}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":140,"b":154}]}],"statement":"DELETE FROM friends.circles c\nUSING auth.users u\nWHERE c.external_id = :circleExternalId::uuid\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.circles c
 * USING auth.users u
 * WHERE c.external_id = :circleExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 * RETURNING c.external_id
 * ```
 */
export const deleteCircle = new PreparedQuery<IDeleteCircleParams,IDeleteCircleResult>(deleteCircleIR);


/** 'UpdateCircleSortOrder' parameters type */
export interface IUpdateCircleSortOrderParams {
  circleExternalId?: string | null | void;
  sortOrder?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateCircleSortOrder' return type */
export interface IUpdateCircleSortOrderResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'UpdateCircleSortOrder' query type */
export interface IUpdateCircleSortOrderQuery {
  params: IUpdateCircleSortOrderParams;
  result: IUpdateCircleSortOrderResult;
}

const updateCircleSortOrderIR: any = {"usedParamSet":{"sortOrder":true,"circleExternalId":true,"userExternalId":true},"params":[{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":46,"b":55}]},{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":133,"b":149}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":216}]}],"statement":"UPDATE friends.circles c\nSET\n    sort_order = :sortOrder,\n    updated_at = current_timestamp\nFROM auth.users u\nWHERE c.external_id = :circleExternalId::uuid\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId::uuid\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.circles c
 * SET
 *     sort_order = :sortOrder,
 *     updated_at = current_timestamp
 * FROM auth.users u
 * WHERE c.external_id = :circleExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 * RETURNING c.external_id
 * ```
 */
export const updateCircleSortOrder = new PreparedQuery<IUpdateCircleSortOrderParams,IUpdateCircleSortOrderResult>(updateCircleSortOrderIR);


/** 'MergeCircles' parameters type */
export interface IMergeCirclesParams {
  sourceCircleExternalId?: string | null | void;
  targetCircleExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'MergeCircles' return type */
export type IMergeCirclesResult = void;

/** 'MergeCircles' query type */
export interface IMergeCirclesQuery {
  params: IMergeCirclesParams;
  result: IMergeCirclesResult;
}

const mergeCirclesIR: any = {"usedParamSet":{"targetCircleExternalId":true,"userExternalId":true,"sourceCircleExternalId":true},"params":[{"name":"targetCircleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":274},{"a":800,"b":822}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":322},{"a":497,"b":511}]},{"name":"sourceCircleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":451,"b":473}]}],"statement":"-- Moves all friends from source circle to target circle (deletion done separately)\nUPDATE friends.friend_circles fc\nSET circle_id = (\n    SELECT tc.id FROM friends.circles tc\n    INNER JOIN auth.users u ON tc.user_id = u.id\n    WHERE tc.external_id = :targetCircleExternalId::uuid\n      AND u.external_id = :userExternalId::uuid\n)\nFROM friends.circles sc\nINNER JOIN auth.users u ON sc.user_id = u.id\nWHERE fc.circle_id = sc.id\n  AND sc.external_id = :sourceCircleExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  -- Avoid duplicates: only move if not already in target circle\n  AND NOT EXISTS (\n    SELECT 1 FROM friends.friend_circles existing\n    INNER JOIN friends.circles tc ON existing.circle_id = tc.id\n    WHERE existing.friend_id = fc.friend_id\n      AND tc.external_id = :targetCircleExternalId::uuid\n  )"};

/**
 * Query generated from SQL:
 * ```
 * -- Moves all friends from source circle to target circle (deletion done separately)
 * UPDATE friends.friend_circles fc
 * SET circle_id = (
 *     SELECT tc.id FROM friends.circles tc
 *     INNER JOIN auth.users u ON tc.user_id = u.id
 *     WHERE tc.external_id = :targetCircleExternalId
 *       AND u.external_id = :userExternalId
 * )
 * FROM friends.circles sc
 * INNER JOIN auth.users u ON sc.user_id = u.id
 * WHERE fc.circle_id = sc.id
 *   AND sc.external_id = :sourceCircleExternalId
 *   AND u.external_id = :userExternalId
 *   -- Avoid duplicates: only move if not already in target circle
 *   AND NOT EXISTS (
 *     SELECT 1 FROM friends.friend_circles existing
 *     INNER JOIN friends.circles tc ON existing.circle_id = tc.id
 *     WHERE existing.friend_id = fc.friend_id
 *       AND tc.external_id = :targetCircleExternalId
 *   )
 * ```
 */
export const mergeCircles = new PreparedQuery<IMergeCirclesParams,IMergeCirclesResult>(mergeCirclesIR);


/** 'GetCircleInternalId' parameters type */
export interface IGetCircleInternalIdParams {
  circleExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetCircleInternalId' return type */
export interface IGetCircleInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetCircleInternalId' query type */
export interface IGetCircleInternalIdQuery {
  params: IGetCircleInternalIdParams;
  result: IGetCircleInternalIdResult;
}

const getCircleInternalIdIR: any = {"usedParamSet":{"circleExternalId":true,"userExternalId":true},"params":[{"name":"circleExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":171,"b":187}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":231}]}],"statement":"-- Helper to get internal ID for a circle (used for merge operations)\nSELECT c.id\nFROM friends.circles c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :circleExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Helper to get internal ID for a circle (used for merge operations)
 * SELECT c.id
 * FROM friends.circles c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :circleExternalId
 *   AND u.external_id = :userExternalId
 * ```
 */
export const getCircleInternalId = new PreparedQuery<IGetCircleInternalIdParams,IGetCircleInternalIdResult>(getCircleInternalIdIR);


