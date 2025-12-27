/** Types generated for queries found in "src/models/queries/contact-social-profiles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetSocialProfilesByContactId' parameters type */
export interface IGetSocialProfilesByContactIdParams {
  contactExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetSocialProfilesByContactId' return type */
export interface IGetSocialProfilesByContactIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Social media platform (linkedin, twitter, facebook, instagram, github, other) */
  platform: string;
  /** Full URL to the profile */
  profile_url: string | null;
  /** Username/handle on the platform */
  username: string | null;
}

/** 'GetSocialProfilesByContactId' query type */
export interface IGetSocialProfilesByContactIdQuery {
  params: IGetSocialProfilesByContactIdParams;
  result: IGetSocialProfilesByContactIdResult;
}

const getSocialProfilesByContactIdIR: any = {"usedParamSet":{"contactExternalId":true,"userExternalId":true},"params":[{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":261,"b":278}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":316}]}],"statement":"SELECT\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at\nFROM contacts.contact_social_profiles sp\nINNER JOIN contacts.contacts c ON sp.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY sp.platform ASC, sp.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     sp.external_id,
 *     sp.platform,
 *     sp.profile_url,
 *     sp.username,
 *     sp.created_at
 * FROM contacts.contact_social_profiles sp
 * INNER JOIN contacts.contacts c ON sp.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY sp.platform ASC, sp.created_at ASC
 * ```
 */
export const getSocialProfilesByContactId = new PreparedQuery<IGetSocialProfilesByContactIdParams,IGetSocialProfilesByContactIdResult>(getSocialProfilesByContactIdIR);


/** 'GetSocialProfileById' parameters type */
export interface IGetSocialProfileByIdParams {
  contactExternalId?: string | null | void;
  profileExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetSocialProfileById' return type */
export interface IGetSocialProfileByIdResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Social media platform (linkedin, twitter, facebook, instagram, github, other) */
  platform: string;
  /** Full URL to the profile */
  profile_url: string | null;
  /** Username/handle on the platform */
  username: string | null;
}

/** 'GetSocialProfileById' query type */
export interface IGetSocialProfileByIdQuery {
  params: IGetSocialProfileByIdParams;
  result: IGetSocialProfileByIdResult;
}

const getSocialProfileByIdIR: any = {"usedParamSet":{"profileExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":262,"b":279}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":303,"b":320}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":344,"b":358}]}],"statement":"SELECT\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at\nFROM contacts.contact_social_profiles sp\nINNER JOIN contacts.contacts c ON sp.contact_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE sp.external_id = :profileExternalId\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     sp.external_id,
 *     sp.platform,
 *     sp.profile_url,
 *     sp.username,
 *     sp.created_at
 * FROM contacts.contact_social_profiles sp
 * INNER JOIN contacts.contacts c ON sp.contact_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE sp.external_id = :profileExternalId
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getSocialProfileById = new PreparedQuery<IGetSocialProfileByIdParams,IGetSocialProfileByIdResult>(getSocialProfileByIdIR);


/** 'CreateSocialProfile' parameters type */
export interface ICreateSocialProfileParams {
  contactExternalId?: string | null | void;
  platform?: string | null | void;
  profileUrl?: string | null | void;
  userExternalId?: string | null | void;
  username?: string | null | void;
}

/** 'CreateSocialProfile' return type */
export interface ICreateSocialProfileResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Social media platform (linkedin, twitter, facebook, instagram, github, other) */
  platform: string;
  /** Full URL to the profile */
  profile_url: string | null;
  /** Username/handle on the platform */
  username: string | null;
}

/** 'CreateSocialProfile' query type */
export interface ICreateSocialProfileQuery {
  params: ICreateSocialProfileParams;
  result: ICreateSocialProfileResult;
}

const createSocialProfileIR: any = {"usedParamSet":{"platform":true,"profileUrl":true,"username":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":138}]},{"name":"profileUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":145,"b":155}]},{"name":"username","required":false,"transform":{"type":"scalar"},"locs":[{"a":162,"b":170}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":280}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":304,"b":318}]}],"statement":"INSERT INTO contacts.contact_social_profiles (\n    contact_id,\n    platform,\n    profile_url,\n    username\n)\nSELECT\n    c.id,\n    :platform,\n    :profileUrl,\n    :username\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    platform,\n    profile_url,\n    username,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO contacts.contact_social_profiles (
 *     contact_id,
 *     platform,
 *     profile_url,
 *     username
 * )
 * SELECT
 *     c.id,
 *     :platform,
 *     :profileUrl,
 *     :username
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     external_id,
 *     platform,
 *     profile_url,
 *     username,
 *     created_at
 * ```
 */
export const createSocialProfile = new PreparedQuery<ICreateSocialProfileParams,ICreateSocialProfileResult>(createSocialProfileIR);


/** 'UpdateSocialProfile' parameters type */
export interface IUpdateSocialProfileParams {
  contactExternalId?: string | null | void;
  platform?: string | null | void;
  profileExternalId?: string | null | void;
  profileUrl?: string | null | void;
  userExternalId?: string | null | void;
  username?: string | null | void;
}

/** 'UpdateSocialProfile' return type */
export interface IUpdateSocialProfileResult {
  created_at: Date;
  /** Public UUID for API exposure */
  external_id: string;
  /** Social media platform (linkedin, twitter, facebook, instagram, github, other) */
  platform: string;
  /** Full URL to the profile */
  profile_url: string | null;
  /** Username/handle on the platform */
  username: string | null;
}

/** 'UpdateSocialProfile' query type */
export interface IUpdateSocialProfileQuery {
  params: IUpdateSocialProfileParams;
  result: IUpdateSocialProfileResult;
}

const updateSocialProfileIR: any = {"usedParamSet":{"platform":true,"profileUrl":true,"username":true,"profileExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":70}]},{"name":"profileUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":91,"b":101}]},{"name":"username","required":false,"transform":{"type":"scalar"},"locs":[{"a":119,"b":127}]},{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":238}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":289,"b":306}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":330,"b":344}]}],"statement":"UPDATE contacts.contact_social_profiles sp\nSET\n    platform = :platform,\n    profile_url = :profileUrl,\n    username = :username\nFROM contacts.contacts c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE sp.external_id = :profileExternalId\n  AND sp.contact_id = c.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE contacts.contact_social_profiles sp
 * SET
 *     platform = :platform,
 *     profile_url = :profileUrl,
 *     username = :username
 * FROM contacts.contacts c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE sp.external_id = :profileExternalId
 *   AND sp.contact_id = c.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING
 *     sp.external_id,
 *     sp.platform,
 *     sp.profile_url,
 *     sp.username,
 *     sp.created_at
 * ```
 */
export const updateSocialProfile = new PreparedQuery<IUpdateSocialProfileParams,IUpdateSocialProfileResult>(updateSocialProfileIR);


/** 'DeleteSocialProfile' parameters type */
export interface IDeleteSocialProfileParams {
  contactExternalId?: string | null | void;
  profileExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteSocialProfile' return type */
export interface IDeleteSocialProfileResult {
  /** Public UUID for API exposure */
  external_id: string;
}

/** 'DeleteSocialProfile' query type */
export interface IDeleteSocialProfileQuery {
  params: IDeleteSocialProfileParams;
  result: IDeleteSocialProfileResult;
}

const deleteSocialProfileIR: any = {"usedParamSet":{"profileExternalId":true,"contactExternalId":true,"userExternalId":true},"params":[{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":111,"b":128}]},{"name":"contactExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":219}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":257}]}],"statement":"DELETE FROM contacts.contact_social_profiles sp\nUSING contacts.contacts c, auth.users u\nWHERE sp.external_id = :profileExternalId\n  AND sp.contact_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :contactExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING sp.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM contacts.contact_social_profiles sp
 * USING contacts.contacts c, auth.users u
 * WHERE sp.external_id = :profileExternalId
 *   AND sp.contact_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :contactExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING sp.external_id
 * ```
 */
export const deleteSocialProfile = new PreparedQuery<IDeleteSocialProfileParams,IDeleteSocialProfileResult>(deleteSocialProfileIR);


