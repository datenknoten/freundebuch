/** Types generated for queries found in "src/models/queries/contact-relationships.sql" */
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

const getAllRelationshipTypesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n    rt.id,\n    rt.category,\n    rt.label,\n    rt.inverse_type_id\nFROM contacts.relationship_types rt\nORDER BY rt.category ASC, rt.label ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     rt.id,
 *     rt.category,
 *     rt.label,
 *     rt.inverse_type_id
 * FROM contacts.relationship_types rt
 * ORDER BY rt.category ASC, rt.label ASC
 * ```
 */
export const getAllRelationshipTypes = new PreparedQuery<IGetAllRelationshipTypesParams,IGetAllRelationshipTypesResult>(getAllRelationshipTypesIR);


/** 'GetRelationshipsByContactId' parameters type */
export interface IGetRelationshipsByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetRelationshipsByContactId' return type */
export interface IGetRelationshipsByContactIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** Primary name shown in lists */
  related_contact_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  related_contact_external_id: string;
  /** URL to 200x200 thumbnail */
  related_contact_photo_thumbnail_url: string | null;
  /** Category: family, professional, or social */
  relationship_category: string;
  /** Type of relationship */
  relationship_type_id: string;
  /** Human-readable label for display */
  relationship_type_label: string;
}

/** 'GetRelationshipsByContactId' query type */
export interface IGetRelationshipsByContactIdQuery {
  params: IGetRelationshipsByContactIdParams;
  result: IGetRelationshipsByContactIdResult;
}

const getRelationshipsByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":636,"b":653}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":677,"b":691}]}],"statement":"SELECT\n    r.external_id,\n    rc.external_id as related_contact_external_id,\n    rc.display_name as related_contact_display_name,\n    rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,\n    r.relationship_type_id,\n    rt.label as relationship_type_label,\n    rt.category as relationship_category,\n    r.notes,\n    r.created_at\nFROM contacts.contact_relationships r\nINNER JOIN contacts.contacts c ON r.contact_id = c.id\nINNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rc.deleted_at IS NULL\nORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     r.external_id,
 *     rc.external_id as related_contact_external_id,
 *     rc.display_name as related_contact_display_name,
 *     rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,
 *     r.relationship_type_id,
 *     rt.label as relationship_type_label,
 *     rt.category as relationship_category,
 *     r.notes,
 *     r.created_at
 * FROM contacts.contact_relationships r
 * INNER JOIN contacts.contacts c ON r.contact_id = c.id
 * INNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id
 * INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rc.deleted_at IS NULL
 * ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC
 * ```
 */
export const getRelationshipsByContactId = new PreparedQuery<IGetRelationshipsByContactIdParams,IGetRelationshipsByContactIdResult>(getRelationshipsByContactIdIR);


/** 'GetRelationshipById' parameters type */
export interface IGetRelationshipByIdParams {
  contactExternalId?: string | null | void;
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
  related_contact_display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  related_contact_external_id: string;
  /** URL to 200x200 thumbnail */
  related_contact_photo_thumbnail_url: string | null;
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

const getRelationshipByIdIR: any = {"usedParamSet":{"relationshipExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":636,"b":658}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":682,"b":699}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":723,"b":737}]}],"statement":"SELECT\n    r.external_id,\n    rc.external_id as related_contact_external_id,\n    rc.display_name as related_contact_display_name,\n    rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,\n    r.relationship_type_id,\n    rt.label as relationship_type_label,\n    rt.category as relationship_category,\n    r.notes,\n    r.created_at\nFROM contacts.contact_relationships r\nINNER JOIN contacts.contacts c ON r.contact_id = c.id\nINNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id\nINNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE r.external_id = :relationshipExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rc.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     r.external_id,
 *     rc.external_id as related_contact_external_id,
 *     rc.display_name as related_contact_display_name,
 *     rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,
 *     r.relationship_type_id,
 *     rt.label as relationship_type_label,
 *     rt.category as relationship_category,
 *     r.notes,
 *     r.created_at
 * FROM contacts.contact_relationships r
 * INNER JOIN contacts.contacts c ON r.contact_id = c.id
 * INNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id
 * INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE r.external_id = :relationshipExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rc.deleted_at IS NULL
 * ```
 */
export const getRelationshipById = new PreparedQuery<IGetRelationshipByIdParams,IGetRelationshipByIdResult>(getRelationshipByIdIR);


/** 'CreateRelationship' parameters type */
export interface ICreateRelationshipParams {
  contactExternalId?: string | null | void;
  notes?: string | null | void;
  relatedContactExternalId?: string | null | void;
  relationshipTypeId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateRelationship' return type */
export interface ICreateRelationshipResult {
  /** The source contact */
  contact_id: number;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** The related contact */
  related_contact_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'CreateRelationship' query type */
export interface ICreateRelationshipQuery {
  params: ICreateRelationshipParams;
  result: ICreateRelationshipResult;
}

const createRelationshipIR: any = {"usedParamSet":{"relationshipTypeId":true,"notes":true,"relatedContactExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":155,"b":173}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":185}]},{"name":"relatedContactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":332}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":404,"b":421}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":445,"b":459}]}],"statement":"INSERT INTO contacts.contact_relationships (\n    contact_id,\n    related_contact_id,\n    relationship_type_id,\n    notes\n)\nSELECT\n    c.id,\n    rc.id,\n    :relationshipTypeId,\n    :notes\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    contact_id,\n    related_contact_id,\n    relationship_type_id,\n    notes,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_relationships (
 *     contact_id,
 *     related_contact_id,
 *     relationship_type_id,
 *     notes
 * )
 * SELECT
 *     c.id,
 *     rc.id,
 *     :relationshipTypeId,
 *     :notes
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     contact_id,
 *     related_contact_id,
 *     relationship_type_id,
 *     notes,
 *     created_at
 * ```
 */
export const createRelationship = new PreparedQuery<ICreateRelationshipParams,ICreateRelationshipResult>(createRelationshipIR);


/** 'CreateInverseRelationship' parameters type */
export interface ICreateInverseRelationshipParams {
  contactExternalId?: string | null | void;
  notes?: string | null | void;
  relatedContactExternalId?: string | null | void;
  relationshipTypeId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateInverseRelationship' return type */
export interface ICreateInverseRelationshipResult {
  /** The source contact */
  contact_id: number;
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Optional notes about the relationship */
  notes: string | null;
  /** The related contact */
  related_contact_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'CreateInverseRelationship' query type */
export interface ICreateInverseRelationshipQuery {
  params: ICreateInverseRelationshipParams;
  result: ICreateInverseRelationshipResult;
}

const createInverseRelationshipIR: any = {"usedParamSet":{"notes":true,"relatedContactExternalId":true,"relationshipTypeId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":179,"b":184}]},{"name":"relatedContactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":307,"b":331}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":434,"b":452}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":476,"b":493}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":517,"b":531}]}],"statement":"INSERT INTO contacts.contact_relationships (\n    contact_id,\n    related_contact_id,\n    relationship_type_id,\n    notes\n)\nSELECT\n    rc.id,\n    c.id,\n    rt.inverse_type_id,\n    :notes\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nINNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL\nINNER JOIN contacts.relationship_types rt ON rt.id = :relationshipTypeId\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND rt.inverse_type_id IS NOT NULL\nRETURNING\n    external_id,\n    contact_id,\n    related_contact_id,\n    relationship_type_id,\n    notes,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_relationships (
 *     contact_id,
 *     related_contact_id,
 *     relationship_type_id,
 *     notes
 * )
 * SELECT
 *     rc.id,
 *     c.id,
 *     rt.inverse_type_id,
 *     :notes
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * INNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
 * INNER JOIN contacts.relationship_types rt ON rt.id = :relationshipTypeId
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND rt.inverse_type_id IS NOT NULL
 * RETURNING
 *     external_id,
 *     contact_id,
 *     related_contact_id,
 *     relationship_type_id,
 *     notes,
 *     created_at
 * ```
 */
export const createInverseRelationship = new PreparedQuery<ICreateInverseRelationshipParams,ICreateInverseRelationshipResult>(createInverseRelationshipIR);


/** 'UpdateRelationship' parameters type */
export interface IUpdateRelationshipParams {
  contactExternalId?: string | null | void;
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

const updateRelationshipIR: any = {"usedParamSet":{"notes":true,"relationshipExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":56,"b":61}]},{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":176}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":243}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":267,"b":281}]}],"statement":"UPDATE contacts.contact_relationships r\nSET\n    notes = :notes\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE r.external_id = :relationshipExternalId\n  AND r.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    r.external_id,\n    r.relationship_type_id,\n    r.notes,\n    r.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_relationships r
 * SET
 *     notes = :notes
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE r.external_id = :relationshipExternalId
 *   AND r.contact_id = c.id
 *   AND c.external_id = :contactExternalId
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
  contactExternalId?: string | null | void;
  relationshipExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteRelationship' return type */
export interface IDeleteRelationshipResult {
  /** Public UUID for API exposure */
  external_id: string;
  /** The related contact */
  related_contact_id: number;
  /** Type of relationship */
  relationship_type_id: string;
}

/** 'DeleteRelationship' query type */
export interface IDeleteRelationshipQuery {
  params: IDeleteRelationshipParams;
  result: IDeleteRelationshipResult;
}

const deleteRelationshipIR: any = {"usedParamSet":{"relationshipExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"relationshipExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":129}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":219}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":257}]}],"statement":"DELETE FROM contacts.contact_relationships r\nUSING contacts.contacts c, auth.users u\nWHERE r.external_id = :relationshipExternalId\n  AND r.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING r.external_id, r.related_contact_id, r.relationship_type_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_relationships r
 * USING contacts.contacts c, auth.users u
 * WHERE r.external_id = :relationshipExternalId
 *   AND r.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING r.external_id, r.related_contact_id, r.relationship_type_id
 * ```
 */
export const deleteRelationship = new PreparedQuery<IDeleteRelationshipParams,IDeleteRelationshipResult>(deleteRelationshipIR);


/** 'DeleteInverseRelationship' parameters type */
export interface IDeleteInverseRelationshipParams {
  contactExternalId?: string | null | void;
  relatedContactId?: number | null | void;
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

const deleteInverseRelationshipIR: any = {"usedParamSet":{"relatedContactId":true,"relationshipTypeId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"relatedContactId","required":false,"transform":{"type":"scalar"},"locs":[{"a":124,"b":140}]},{"name":"relationshipTypeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":258}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":411}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":439,"b":453}]}],"statement":"DELETE FROM contacts.contact_relationships r\nUSING contacts.contacts c, contacts.relationship_types rt\nWHERE r.contact_id = :relatedContactId\n  AND r.related_contact_id = c.id\n  AND r.relationship_type_id = rt.inverse_type_id\n  AND rt.id = :relationshipTypeId\n  AND c.id = (\n    SELECT c2.id FROM contacts.contacts c2\n    INNER JOIN auth.users u ON c2.user_id = u.id\n    WHERE c2.external_id = :contactExternalId\n      AND u.external_id = :userExternalId\n      AND c2.deleted_at IS NULL\n  )\nRETURNING r.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_relationships r
 * USING contacts.contacts c, contacts.relationship_types rt
 * WHERE r.contact_id = :relatedContactId
 *   AND r.related_contact_id = c.id
 *   AND r.relationship_type_id = rt.inverse_type_id
 *   AND rt.id = :relationshipTypeId
 *   AND c.id = (
 *     SELECT c2.id FROM contacts.contacts c2
 *     INNER JOIN auth.users u ON c2.user_id = u.id
 *     WHERE c2.external_id = :contactExternalId
 *       AND u.external_id = :userExternalId
 *       AND c2.deleted_at IS NULL
 *   )
 * RETURNING r.external_id
 * ```
 */
export const deleteInverseRelationship = new PreparedQuery<IDeleteInverseRelationshipParams,IDeleteInverseRelationshipResult>(deleteInverseRelationshipIR);


/** 'SearchContacts' parameters type */
export interface ISearchContactsParams {
  excludeContactExternalId?: string | null | void;
  limit?: NumberOrString | null | void;
  searchPattern?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SearchContacts' return type */
export interface ISearchContactsResult {
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
}

/** 'SearchContacts' query type */
export interface ISearchContactsQuery {
  params: ISearchContactsParams;
  result: ISearchContactsResult;
}

const searchContactsIR: any = {"usedParamSet":{"userExternalId":true,"searchPattern":true,"excludeContactExternalId":true,"limit":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":163,"b":177}]},{"name":"searchPattern","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":246}]},{"name":"excludeContactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":255,"b":279},{"a":315,"b":339}]},{"name":"limit","required":false,"transform":{"type":"scalar"},"locs":[{"a":376,"b":381}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.photo_thumbnail_url\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\n  AND c.display_name ILIKE :searchPattern\n  AND (:excludeContactExternalId::uuid IS NULL OR c.external_id != :excludeContactExternalId)\nORDER BY c.display_name ASC\nLIMIT :limit"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.photo_thumbnail_url
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 *   AND c.display_name ILIKE :searchPattern
 *   AND (:excludeContactExternalId::uuid IS NULL OR c.external_id != :excludeContactExternalId)
 * ORDER BY c.display_name ASC
 * LIMIT :limit
 * ```
 */
export const searchContacts = new PreparedQuery<ISearchContactsParams,ISearchContactsResult>(searchContactsIR);


