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

const getContactByIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":325}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":363}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

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
 * FROM contacts.contacts c
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

const getContactInternalIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":120}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":158}]}],"statement":"SELECT c.id\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id
 * FROM contacts.contacts c
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

const getContactsByUserIdIR: any = {"usedParamSet":{"userExternalId":true,"sortBy":true,"sortOrder":true,"pageSize":true,"offset":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":484}]},{"name":"sortBy","required":false,"transform":{"type":"scalar"},"locs":[{"a":536,"b":542},{"a":627,"b":633},{"a":720,"b":726},{"a":807,"b":813},{"a":896,"b":902},{"a":983,"b":989}]},{"name":"sortOrder","required":false,"transform":{"type":"scalar"},"locs":[{"a":565,"b":574},{"a":656,"b":665},{"a":747,"b":756},{"a":834,"b":843},{"a":923,"b":932},{"a":1010,"b":1019}]},{"name":"pageSize","required":false,"transform":{"type":"scalar"},"locs":[{"a":1063,"b":1071}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1080,"b":1086}]}],"statement":"SELECT\n    c.external_id,\n    c.display_name,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at,\n    (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,\n    (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'asc' THEN c.display_name END ASC,\n    CASE WHEN :sortBy = 'display_name' AND :sortOrder = 'desc' THEN c.display_name END DESC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'asc' THEN c.created_at END ASC,\n    CASE WHEN :sortBy = 'created_at' AND :sortOrder = 'desc' THEN c.created_at END DESC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'asc' THEN c.updated_at END ASC,\n    CASE WHEN :sortBy = 'updated_at' AND :sortOrder = 'desc' THEN c.updated_at END DESC\nLIMIT :pageSize\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     c.external_id,
 *     c.display_name,
 *     c.photo_thumbnail_url,
 *     c.created_at,
 *     c.updated_at,
 *     (SELECT e.email_address FROM contacts.contact_emails e WHERE e.contact_id = c.id AND e.is_primary = true LIMIT 1) as primary_email,
 *     (SELECT p.phone_number FROM contacts.contact_phones p WHERE p.contact_id = c.id AND p.is_primary = true LIMIT 1) as primary_phone
 * FROM contacts.contacts c
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

const countContactsByUserIdIR: any = {"usedParamSet":{"userExternalId":true},"params":[{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":121,"b":135}]}],"statement":"SELECT COUNT(*)::int as count\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*)::int as count
 * FROM contacts.contacts c
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

const createContactIR: any = {"usedParamSet":{"displayName":true,"namePrefix":true,"nameFirst":true,"nameMiddle":true,"nameLast":true,"nameSuffix":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":167,"b":178}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":185,"b":195}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":211}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":218,"b":228}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":235,"b":243}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":260}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":316}]}],"statement":"INSERT INTO contacts.contacts (\n    user_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix\n)\nSELECT\n    u.id,\n    :displayName,\n    :namePrefix,\n    :nameFirst,\n    :nameMiddle,\n    :nameLast,\n    :nameSuffix\nFROM auth.users u\nWHERE u.external_id = :userExternalId\nRETURNING\n    external_id,\n    display_name,\n    name_prefix,\n    name_first,\n    name_middle,\n    name_last,\n    name_suffix,\n    photo_url,\n    photo_thumbnail_url,\n    created_at,\n    updated_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contacts (
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

const updateContactIR: any = {"usedParamSet":{"displayName":true,"updateNamePrefix":true,"namePrefix":true,"updateNameFirst":true,"nameFirst":true,"updateNameMiddle":true,"nameMiddle":true,"updateNameLast":true,"nameLast":true,"updateNameSuffix":true,"nameSuffix":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"displayName","required":false,"transform":{"type":"scalar"},"locs":[{"a":59,"b":70}]},{"name":"updateNamePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":134}]},{"name":"namePrefix","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":151}]},{"name":"updateNameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":219}]},{"name":"nameFirst","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":235}]},{"name":"updateNameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":304}]},{"name":"nameMiddle","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":321}]},{"name":"updateNameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":373,"b":387}]},{"name":"nameLast","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":402}]},{"name":"updateNameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":454,"b":470}]},{"name":"nameSuffix","required":false,"transform":{"type":"scalar"},"locs":[{"a":477,"b":487}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":552,"b":569}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":616,"b":630}]}],"statement":"UPDATE contacts.contacts c\nSET\n    display_name = COALESCE(:displayName, c.display_name),\n    name_prefix = CASE WHEN :updateNamePrefix THEN :namePrefix ELSE c.name_prefix END,\n    name_first = CASE WHEN :updateNameFirst THEN :nameFirst ELSE c.name_first END,\n    name_middle = CASE WHEN :updateNameMiddle THEN :nameMiddle ELSE c.name_middle END,\n    name_last = CASE WHEN :updateNameLast THEN :nameLast ELSE c.name_last END,\n    name_suffix = CASE WHEN :updateNameSuffix THEN :nameSuffix ELSE c.name_suffix END\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.display_name,\n    c.name_prefix,\n    c.name_first,\n    c.name_middle,\n    c.name_last,\n    c.name_suffix,\n    c.photo_url,\n    c.photo_thumbnail_url,\n    c.created_at,\n    c.updated_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
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

const softDeleteContactIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":102,"b":119}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":180}]}],"statement":"UPDATE contacts.contacts c\nSET deleted_at = CURRENT_TIMESTAMP\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING c.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
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

const updateContactPhotoIR: any = {"usedParamSet":{"photoUrl":true,"photoThumbnailUrl":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"photoUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":55}]},{"name":"photoThumbnailUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":84,"b":101}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":160}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":221}]}],"statement":"UPDATE contacts.contacts c\nSET\n    photo_url = :photoUrl,\n    photo_thumbnail_url = :photoThumbnailUrl\nFROM auth.users u\nWHERE c.external_id = :contactExternalId\n  AND c.user_id = u.id\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    c.external_id,\n    c.photo_url,\n    c.photo_thumbnail_url"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contacts c
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


