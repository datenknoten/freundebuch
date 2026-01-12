/** Types generated for queries found in "src/models/queries/friend-relationships.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetAllRelationshipTypes' parameters type */
export type IGetAllRelationshipTypesParams = void;

/** 'GetAllRelationshipTypes' return type */
export interface IGetAllRelationshipTypesResult {
  /** Category: family, professional, or social */
  category: string;
  /** Relationship type identifier (e.g., spouse, parent, child) */
  id: string;
  /** The inverse relationship type (e.g., parent <-> child) */
  inverse_type_id: string | null;
  /** Human-readable label for display */
  label: string;
}

/** 'GetAllRelationshipTypes' query type */
export interface IGetAllRelationshipTypesQuery {
  params: IGetAllRelationshipTypesParams;
  result: IGetAllRelationshipTypesResult;
}

const getAllRelationshipTypesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n    rt.id,\n    rt.category,\n    rt.label,\n    rt.inverse_type_id\nFROM friends.relationship_types rt\nORDER BY rt.category ASC, rt.label ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     rt.id,
 *     rt.category,
 *     rt.label,
 *     rt.inverse_type_id
 * FROM friends.relationship_types rt
 * ORDER BY rt.category ASC, rt.label ASC
 * ```
 */
export const getAllRelationshipTypes = new PreparedQuery<IGetAllRelationshipTypesParams,IGetAllRelationshipTypesResult>(getAllRelationshipTypesIR);


/** 'GetRelationshipsByFriendId' parameters type */
export interface IGetRelationshipsByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetRelationshipsByFriendId' return type */
export interface IGetRelationshipsByFriendIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** Primary name shown in lists */
  related_friend_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  related_friend_external_id: string;
  /** URL to 200x200 thumbnail */
  related_friend_photo_thumbnail_url: string | null;
  /** Category: family, professional, or social */
  relationship_category: string;
  /** Type of relationship */
  relationship_type_id: string;
  /** Human-readable label for display */
  relationship_type_label: string;
}

/** 'GetRelationshipsByFriendId' query type */
export interface IGetRelationshipsByFriendIdQuery {
  params: IGetRelationshipsByFriendIdParams;
  result: IGetRelationshipsByFriendIdResult;
}

const getRelationshipsByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":624,"b":640}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":664,"b":678}]}],"statement":"SELECT\n    r.external_id,\n    rc.external_id as related_friend_external_id,\n    rc.display_name as related_friend_display_name,\n    rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,\n    r.relationship_type_id,\n    rt.label as relationship_type_label,\n    rt.category as relationship_category,\n    r.notes,\n    r.created_at\nFROM friends.friend_relationships r\nINNER JOIN friends.friends c ON r.friend_id = c.id\nINNER JOIN friends.friends rc ON r.related_friend_id = rc.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rc.deleted_at IS NULL\nORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     r.external_id,
 *     rc.external_id as related_friend_external_id,
 *     rc.display_name as related_friend_display_name,
 *     rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,
 *     r.relationship_type_id,
 *     rt.label as relationship_type_label,
 *     rt.category as relationship_category,
 *     r.notes,
 *     r.created_at
 * FROM friends.friend_relationships r
 * INNER JOIN friends.friends c ON r.friend_id = c.id
 * INNER JOIN friends.friends rc ON r.related_friend_id = rc.id
 * INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rc.deleted_at IS NULL
 * ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC
 * ```
 */
export const getRelationshipsByFriendId = new PreparedQuery<IGetRelationshipsByFriendIdParams,IGetRelationshipsByFriendIdResult>(getRelationshipsByFriendIdIR);


/** 'GetRelationshipById' parameters type */
export interface IGetRelationshipByIdParams {
  friendExternalId?: string | null | void;
  relationshipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetRelationshipById' return type */
export interface IGetRelationshipByIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** Primary name shown in lists */
  related_friend_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  related_friend_external_id: string;
  /** URL to 200x200 thumbnail */
  related_friend_photo_thumbnail_url: string | null;
  /** Category: family, professional, or social */
  relationship_category: string;
  /** Type of relationship */
  relationship_type_id: string;
  /** Human-readable label for display */
  relationship_type_label: string;
}

/** 'GetRelationshipById' query type */
export interface IGetRelationshipByIdQuery {
  params: IGetRelationshipByIdParams;
  result: IGetRelationshipByIdResult;
}

const getRelationshipByIdIR: any = {"usedParamSet":{"relationshipExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":624,"b":646}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":670,"b":686}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":710,"b":724}]}],"statement":"SELECT\n    r.external_id,\n    rc.external_id as related_friend_external_id,\n    rc.display_name as related_friend_display_name,\n    rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,\n    r.relationship_type_id,\n    rt.label as relationship_type_label,\n    rt.category as relationship_category,\n    r.notes,\n    r.created_at\nFROM friends.friend_relationships r\nINNER JOIN friends.friends c ON r.friend_id = c.id\nINNER JOIN friends.friends rc ON r.related_friend_id = rc.id\nINNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE r.external_id = :relationshipExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rc.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     r.external_id,
 *     rc.external_id as related_friend_external_id,
 *     rc.display_name as related_friend_display_name,
 *     rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,
 *     r.relationship_type_id,
 *     rt.label as relationship_type_label,
 *     rt.category as relationship_category,
 *     r.notes,
 *     r.created_at
 * FROM friends.friend_relationships r
 * INNER JOIN friends.friends c ON r.friend_id = c.id
 * INNER JOIN friends.friends rc ON r.related_friend_id = rc.id
 * INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE r.external_id = :relationshipExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rc.deleted_at IS NULL
 * ```
 */
export const getRelationshipById = new PreparedQuery<IGetRelationshipByIdParams,IGetRelationshipByIdResult>(getRelationshipByIdIR);


/** 'CreateRelationship' parameters type */
export interface ICreateRelationshipParams {
  friendExternalId?: string | null | void;
  notes?: string | null | void;
  relatedFriendExternalId?: string | null | void;
  relationshipTypeId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateRelationship' return type */
export interface ICreateRelationshipResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** The source friend */
  friend_id: number;
  /** Optional notes about the relationship */
  notes: string | null;
  /** The related friend */
  related_friend_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'CreateRelationship' query type */
export interface ICreateRelationshipQuery {
  params: ICreateRelationshipParams;
  result: ICreateRelationshipResult;
}

const createRelationshipIR: any = {"usedParamSet":{"relationshipTypeId":true,"notes":true,"relatedFriendExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":169}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":181}]},{"name":"relatedFriendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":323}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":395,"b":411}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":435,"b":449}]}],"statement":"INSERT INTO friends.friend_relationships (\n    friend_id,\n    related_friend_id,\n    relationship_type_id,\n    notes\n)\nSELECT\n    c.id,\n    rc.id,\n    :relationshipTypeId,\n    :notes\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    friend_id,\n    related_friend_id,\n    relationship_type_id,\n    notes,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_relationships (
 *     friend_id,
 *     related_friend_id,
 *     relationship_type_id,
 *     notes
 * )
 * SELECT
 *     c.id,
 *     rc.id,
 *     :relationshipTypeId,
 *     :notes
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     friend_id,
 *     related_friend_id,
 *     relationship_type_id,
 *     notes,
 *     created_at
 * ```
 */
export const createRelationship = new PreparedQuery<ICreateRelationshipParams,ICreateRelationshipResult>(createRelationshipIR);


/** 'CreateInverseRelationship' parameters type */
export interface ICreateInverseRelationshipParams {
  friendExternalId?: string | null | void;
  notes?: string | null | void;
  relatedFriendExternalId?: string | null | void;
  relationshipTypeId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateInverseRelationship' return type */
export interface ICreateInverseRelationshipResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** The source friend */
  friend_id: number;
  /** Optional notes about the relationship */
  notes: string | null;
  /** The related friend */
  related_friend_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'CreateInverseRelationship' query type */
export interface ICreateInverseRelationshipQuery {
  params: ICreateInverseRelationshipParams;
  result: ICreateInverseRelationshipResult;
}

const createInverseRelationshipIR: any = {"usedParamSet":{"notes":true,"relatedFriendExternalId":true,"relationshipTypeId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":180}]},{"name":"relatedFriendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":299,"b":322}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":424,"b":442}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":466,"b":482}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":506,"b":520}]}],"statement":"INSERT INTO friends.friend_relationships (\n    friend_id,\n    related_friend_id,\n    relationship_type_id,\n    notes\n)\nSELECT\n    rc.id,\n    c.id,\n    rt.inverse_type_id,\n    :notes\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL\nINNER JOIN friends.relationship_types rt ON rt.id = :relationshipTypeId\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rt.inverse_type_id IS NOT NULL\nRETURNING\n    external_id,\n    friend_id,\n    related_friend_id,\n    relationship_type_id,\n    notes,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_relationships (
 *     friend_id,
 *     related_friend_id,
 *     relationship_type_id,
 *     notes
 * )
 * SELECT
 *     rc.id,
 *     c.id,
 *     rt.inverse_type_id,
 *     :notes
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
 * INNER JOIN friends.relationship_types rt ON rt.id = :relationshipTypeId
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rt.inverse_type_id IS NOT NULL
 * RETURNING
 *     external_id,
 *     friend_id,
 *     related_friend_id,
 *     relationship_type_id,
 *     notes,
 *     created_at
 * ```
 */
export const createInverseRelationship = new PreparedQuery<ICreateInverseRelationshipParams,ICreateInverseRelationshipResult>(createInverseRelationshipIR);


/** 'UpdateRelationship' parameters type */
export interface IUpdateRelationshipParams {
  friendExternalId?: string | null | void;
  notes?: string | null | void;
  relationshipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateRelationship' return type */
export interface IUpdateRelationshipResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'UpdateRelationship' query type */
export interface IUpdateRelationshipQuery {
  params: IUpdateRelationshipParams;
  result: IUpdateRelationshipResult;
}

const updateRelationshipIR: any = {"usedParamSet":{"notes":true,"relationshipExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":54,"b":59}]},{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":150,"b":172}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":237}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":275}]}],"statement":"UPDATE friends.friend_relationships r\nSET\n    notes = :notes\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE r.external_id = :relationshipExternalId\n  AND r.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    r.external_id,\n    r.relationship_type_id,\n    r.notes,\n    r.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_relationships r
 * SET
 *     notes = :notes
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE r.external_id = :relationshipExternalId
 *   AND r.friend_id = c.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     r.external_id,
 *     r.relationship_type_id,
 *     r.notes,
 *     r.created_at
 * ```
 */
export const updateRelationship = new PreparedQuery<IUpdateRelationshipParams,IUpdateRelationshipResult>(updateRelationshipIR);


/** 'DeleteRelationship' parameters type */
export interface IDeleteRelationshipParams {
  friendExternalId?: string | null | void;
  relationshipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteRelationship' return type */
export interface IDeleteRelationshipResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** The related friend */
  related_friend_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'DeleteRelationship' query type */
export interface IDeleteRelationshipQuery {
  params: IDeleteRelationshipParams;
  result: IDeleteRelationshipResult;
}

const deleteRelationshipIR: any = {"usedParamSet":{"relationshipExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":125}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":197,"b":213}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":237,"b":251}]}],"statement":"DELETE FROM friends.friend_relationships r\nUSING friends.friends c, auth.users u\nWHERE r.external_id = :relationshipExternalId\n  AND r.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING r.external_id, r.related_friend_id, r.relationship_type_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_relationships r
 * USING friends.friends c, auth.users u
 * WHERE r.external_id = :relationshipExternalId
 *   AND r.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING r.external_id, r.related_friend_id, r.relationship_type_id
 * ```
 */
export const deleteRelationship = new PreparedQuery<IDeleteRelationshipParams,IDeleteRelationshipResult>(deleteRelationshipIR);


/** 'DeleteInverseRelationship' parameters type */
export interface IDeleteInverseRelationshipParams {
  friendExternalId?: string | null | void;
  relatedFriendId?: number | null | void;
  relationshipTypeId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteInverseRelationship' return type */
export interface IDeleteInverseRelationshipResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteInverseRelationship' query type */
export interface IDeleteInverseRelationshipQuery {
  params: IDeleteInverseRelationshipParams;
  result: IDeleteInverseRelationshipResult;
}

const deleteInverseRelationshipIR: any = {"usedParamSet":{"relatedFriendId":true,"relationshipTypeId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"relatedFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":133}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":250}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":384,"b":400}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":428,"b":442}]}],"statement":"DELETE FROM friends.friend_relationships r\nUSING friends.friends c, friends.relationship_types rt\nWHERE r.friend_id = :relatedFriendId\n  AND r.related_friend_id = c.id\n  AND r.relationship_type_id = rt.inverse_type_id\n  AND rt.id = :relationshipTypeId\n  AND c.id = (\n    SELECT c2.id FROM friends.friends c2\n    INNER JOIN auth.users u ON c2.user_id = u.id\n    WHERE c2.external_id = :friendExternalId\n      AND u.external_id = :userExternalId\n      AND c2.deleted_at IS NULL\n  )\nRETURNING r.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_relationships r
 * USING friends.friends c, friends.relationship_types rt
 * WHERE r.friend_id = :relatedFriendId
 *   AND r.related_friend_id = c.id
 *   AND r.relationship_type_id = rt.inverse_type_id
 *   AND rt.id = :relationshipTypeId
 *   AND c.id = (
 *     SELECT c2.id FROM friends.friends c2
 *     INNER JOIN auth.users u ON c2.user_id = u.id
 *     WHERE c2.external_id = :friendExternalId
 *       AND u.external_id = :userExternalId
 *       AND c2.deleted_at IS NULL
 *   )
 * RETURNING r.external_id
 * ```
 */
export const deleteInverseRelationship = new PreparedQuery<IDeleteInverseRelationshipParams,IDeleteInverseRelationshipResult>(deleteInverseRelationshipIR);


/** 'SearchFriends' parameters type */
export interface ISearchFriendsParams {
  excludeFriendExternalId?: string | null | void;
  limit?: NumberOrString | null | void;
  searchPattern?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SearchFriends' return type */
export interface ISearchFriendsResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
}

/** 'SearchFriends' query type */
export interface ISearchFriendsQuery {
  params: ISearchFriendsParams;
  result: ISearchFriendsResult;
}

const searchFriendsIR: any = {"usedParamSet":{"userExternalId":true,"searchPattern":true,"excludeFriendExternalId":true,"limit":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":161,"b":175}]},{"name":"searchPattern","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":244}]},{"name":"excludeFriendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":253,"b":276},{"a":312,"b":335}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":377}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.photo_thumbnail_url\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND c.display_name ILIKE :searchPattern\n  AND (:excludeFriendExternalId::uuid IS NULL OR c.external_id != :excludeFriendExternalId)\nORDER BY c.display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.photo_thumbnail_url
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND c.display_name ILIKE :searchPattern
 *   AND (:excludeFriendExternalId::uuid IS NULL OR c.external_id != :excludeFriendExternalId)
 * ORDER BY c.display_name ASC
 * LIMIT :limit
 * ```
 */
export const searchFriends = new PreparedQuery<ISearchFriendsParams,ISearchFriendsResult>(searchFriendsIR);


