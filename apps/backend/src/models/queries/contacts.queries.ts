/** Types generated for queries found in "src/models/queries/contacts.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetContactById' parameters type */
export interface IGetContactByIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactById' return type */
export interface IGetContactByIdResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'GetContactById' query type */
export interface IGetContactByIdQuery {
  params: IGetContactByIdParams;
  result: IGetContactByIdResult;
}

const getContactByIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":299,"b":316}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":340,"b":354}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getContactById = new PreparedQuery<IGetContactByIdParams,IGetContactByIdResult>(getContactByIdIR);


/** 'GetContactInternalId' parameters type */
export interface IGetContactInternalIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactInternalId' return type */
export interface IGetContactInternalIdResult {
  /** Internal sequential ID (never expose in API) */
  id: number;
}

/** 'GetContactInternalId' query type */
export interface IGetContactInternalIdQuery {
  params: IGetContactInternalIdParams;
  result: IGetContactInternalIdResult;
}

const getContactInternalIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":94,"b":111}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":149}]}],"statement":"SELECT c.id\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getContactInternalId = new PreparedQuery<IGetContactInternalIdParams,IGetContactInternalIdResult>(getContactInternalIdIR);


/** 'GetContactsByUserId' parameters type */
export interface IGetContactsByUserIdParams {
  offset?: NumberOrString | null | void;
  pageSize?: NumberOrString | null | void;
  sortBy?: string | null | void;
  sortOrder?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetContactsByUserId' return type */
export interface IGetContactsByUserIdResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  updated_at: Date;
}

/** 'GetContactsByUserId' query type */
export interface IGetContactsByUserIdQuery {
  params: IGetContactsByUserIdParams;
  result: IGetContactsByUserIdResult;
}

const getContactsByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":443,"b":457}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":509,"b":515},{"a":600,"b":606},{"a":693,"b":699},{"a":780,"b":786},{"a":869,"b":875},{"a":956,"b":962}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":538,"b":547},{"a":629,"b":638},{"a":720,"b":729},{"a":807,"b":816},{"a":896,"b":905},{"a":983,"b":992}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":1036,"b":1044}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1053,"b":1059}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at,\n    (SELECT e.email_address FROM contact_emails e WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n    (SELECT p.phone_number FROM contact_phones p WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at,
 *     (SELECT e.email_address FROM contact_emails e WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     (SELECT p.phone_number FROM contact_phones p WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY
 *     CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,
 *     CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,
 *     CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,
 *     CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,
 *     CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,
 *     CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC
 * LIMIT :pageSize
 * OFFSET :offset
 * ```
 */
export const getContactsByUserId = new PreparedQuery<IGetContactsByUserIdParams,IGetContactsByUserIdResult>(getContactsByUserIdIR);


/** 'CountContactsByUserId' parameters type */
export interface ICountContactsByUserIdParams {
  userExternalId?: string | null | void;
}

/** 'CountContactsByUserId' return type */
export interface ICountContactsByUserIdResult {
  count: number | null;
}

/** 'CountContactsByUserId' query type */
export interface ICountContactsByUserIdQuery {
  params: ICountContactsByUserIdParams;
  result: ICountContactsByUserIdResult;
}

const countContactsByUserIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":126}]}],"statement":"SELECT COUNT(*)::int as count\nFROM contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::int as count
 * FROM contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const countContactsByUserId = new PreparedQuery<ICountContactsByUserIdParams,ICountContactsByUserIdResult>(countContactsByUserIdIR);


/** 'CreateContact' parameters type */
export interface ICreateContactParams {
  displayName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateContact' return type */
export interface ICreateContactResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'CreateContact' query type */
export interface ICreateContactQuery {
  params: ICreateContactParams;
  result: ICreateContactResult;
}

const createContactIR: any = {"usedParamSet":{"displayName":true,"namePrefix":true,"nameFirst":true,"nameMiddle":true,"nameLast":true,"nameSuffix":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":169}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":186}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":193,"b":202}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":219}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":234}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":251}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":293,"b":307}]}],"statement":"INSERT INTO contacts (\n    user_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix\n)\nSELECT\n    u.id,\n    :displayName,\n    :namePrefix,\n    :nameFirst,\n    :nameMiddle,\n    :nameLast,\n    :nameSuffix\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING\n    external_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    photo_url,\n    photo_thumbnail_url,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts (
 *     user_id,
 *     display_name,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix
 * )
 * SELECT
 *     u.id,
 *     :displayName,
 *     :namePrefix,
 *     :nameFirst,
 *     :nameMiddle,
 *     :nameLast,
 *     :nameSuffix
 * FROM auth.users u
 * WHERE u.external_id = :userExternalId
 * RETURNING
 *     external_id,
 *     display_name,
 *     name_prefix,
 *     name_first,
 *     name_middle,
 *     name_last,
 *     name_suffix,
 *     photo_url,
 *     photo_thumbnail_url,
 *     created_at,
 *     updated_at
 * ```
 */
export const createContact = new PreparedQuery<ICreateContactParams,ICreateContactResult>(createContactIR);


/** 'UpdateContact' parameters type */
export interface IUpdateContactParams {
  contactExternalId?: string | null | void;
  displayName?: string | null | void;
  nameFirst?: string | null | void;
  nameLast?: string | null | void;
  nameMiddle?: string | null | void;
  namePrefix?: string | null | void;
  nameSuffix?: string | null | void;
  updateNameFirst?: boolean | null | void;
  updateNameLast?: boolean | null | void;
  updateNameMiddle?: boolean | null | void;
  updateNamePrefix?: boolean | null | void;
  updateNameSuffix?: boolean | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateContact' return type */
export interface IUpdateContactResult {
  created_at: Date;
  /** Primary name shown in lists */
  display_name: string;
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** First/given name */
  name_first: string | null;
  /** Last/family name */
  name_last: string | null;
  /** Middle name(s) */
  name_middle: string | null;
  /** Dr., Mr., Ms., Prof., etc. */
  name_prefix: string | null;
  /** Jr., Sr., III, PhD, etc. */
  name_suffix: string | null;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
  updated_at: Date;
}

/** 'UpdateContact' query type */
export interface IUpdateContactQuery {
  params: IUpdateContactParams;
  result: IUpdateContactResult;
}

const updateContactIR: any = {"usedParamSet":{"displayName":true,"updateNamePrefix":true,"namePrefix":true,"updateNameFirst":true,"nameFirst":true,"updateNameMiddle":true,"nameMiddle":true,"updateNameLast":true,"nameLast":true,"updateNameSuffix":true,"nameSuffix":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":61}]},{"name":"updateNamePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":109,"b":125}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":132,"b":142}]},{"name":"updateNameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":210}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":226}]},{"name":"updateNameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":279,"b":295}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":312}]},{"name":"updateNameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":364,"b":378}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":385,"b":393}]},{"name":"updateNameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":445,"b":461}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":468,"b":478}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":543,"b":560}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":607,"b":621}]}],"statement":"UPDATE contacts c\nSET\n    display_name = COALESCE(:displayName, c.display_name),\n    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,\n    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,\n    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,\n    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,\n    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts c
 * SET
 *     display_name = COALESCE(:displayName, c.display_name),
 *     name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,
 *     name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,
 *     name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,
 *     name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,
 *     name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.display_name,
 *     c.name_prefix,
 *     c.name_first,
 *     c.name_middle,
 *     c.name_last,
 *     c.name_suffix,
 *     c.photo_url,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at
 * ```
 */
export const updateContact = new PreparedQuery<IUpdateContactParams,IUpdateContactResult>(updateContactIR);


/** 'SoftDeleteContact' parameters type */
export interface ISoftDeleteContactParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'SoftDeleteContact' return type */
export interface ISoftDeleteContactResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
}

/** 'SoftDeleteContact' query type */
export interface ISoftDeleteContactQuery {
  params: ISoftDeleteContactParams;
  result: ISoftDeleteContactResult;
}

const softDeleteContactIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":110}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":171}]}],"statement":"UPDATE contacts c\nSET deleted_at = CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts c
 * SET deleted_at = CURRENT_TIMESTAMP
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING c.external_id
 * ```
 */
export const softDeleteContact = new PreparedQuery<ISoftDeleteContactParams,ISoftDeleteContactResult>(softDeleteContactIR);


/** 'UpdateContactPhoto' parameters type */
export interface IUpdateContactPhotoParams {
  contactExternalId?: string | null | void;
  photoThumbnailUrl?: string | null | void;
  photoUrl?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateContactPhoto' return type */
export interface IUpdateContactPhotoResult {
  /** Public UUID for API exposure (always use this in APIs) */
  external_id: string;
  /** URL to 200x200 thumbnail */
  photo_thumbnail_url: string | null;
  /** URL to original profile picture */
  photo_url: string | null;
}

/** 'UpdateContactPhoto' query type */
export interface IUpdateContactPhotoQuery {
  params: IUpdateContactPhotoParams;
  result: IUpdateContactPhotoResult;
}

const updateContactPhotoIR: any = {"usedParamSet":{"photoUrl":true,"photoThumbnailUrl":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":38,"b":46}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":75,"b":92}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":151}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":198,"b":212}]}],"statement":"UPDATE contacts c\nSET\n    photo_url = :photoUrl,\n    photo_thumbnail_url = :photoThumbnailUrl\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.photo_url,\n    c.photo_thumbnail_url"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts c
 * SET
 *     photo_url = :photoUrl,
 *     photo_thumbnail_url = :photoThumbnailUrl
 * FROM auth.users u
 * WHERE c.external_id = :contactExternalId
 *   AND c.user_id = u.id
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     c.external_id,
 *     c.photo_url,
 *     c.photo_thumbnail_url
 * ```
 */
export const updateContactPhoto = new PreparedQuery<IUpdateContactPhotoParams,IUpdateContactPhotoResult>(updateContactPhotoIR);


