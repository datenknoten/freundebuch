/** Types generated for queries found in "src/models/queries/friend-social-profiles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetSocialProfilesByFriendId' parameters type */
export interface IGetSocialProfilesByFriendIdParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetSocialProfilesByFriendId' return type */
export interface IGetSocialProfilesByFriendIdResult {
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

/** 'GetSocialProfilesByFriendId' query type */
export interface IGetSocialProfilesByFriendIdQuery {
  params: IGetSocialProfilesByFriendIdParams;
  result: IGetSocialProfilesByFriendIdResult;
}

const getSocialProfilesByFriendIdIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":256,"b":272}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":310}]}],"statement":"SELECT\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at\nFROM friends.friend_social_profiles sp\nINNER JOIN friends.friends c ON sp.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nORDER BY sp.platform ASC, sp.created_at ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     sp.external_id,
 *     sp.platform,
 *     sp.profile_url,
 *     sp.username,
 *     sp.created_at
 * FROM friends.friend_social_profiles sp
 * INNER JOIN friends.friends c ON sp.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ORDER BY sp.platform ASC, sp.created_at ASC
 * ```
 */
export const getSocialProfilesByFriendId = new PreparedQuery<IGetSocialProfilesByFriendIdParams,IGetSocialProfilesByFriendIdResult>(getSocialProfilesByFriendIdIR);


/** 'GetSocialProfileById' parameters type */
export interface IGetSocialProfileByIdParams {
  friendExternalId?: string | null | void;
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

const getSocialProfileByIdIR: any = {"usedParamSet":{"profileExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":257,"b":274}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":314}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":338,"b":352}]}],"statement":"SELECT\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at\nFROM friends.friend_social_profiles sp\nINNER JOIN friends.friends c ON sp.friend_id = c.id\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE sp.external_id = :profileExternalId\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     sp.external_id,
 *     sp.platform,
 *     sp.profile_url,
 *     sp.username,
 *     sp.created_at
 * FROM friends.friend_social_profiles sp
 * INNER JOIN friends.friends c ON sp.friend_id = c.id
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE sp.external_id = :profileExternalId
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * ```
 */
export const getSocialProfileById = new PreparedQuery<IGetSocialProfileByIdParams,IGetSocialProfileByIdResult>(getSocialProfileByIdIR);


/** 'CreateSocialProfile' parameters type */
export interface ICreateSocialProfileParams {
  friendExternalId?: string | null | void;
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

const createSocialProfileIR: any = {"usedParamSet":{"platform":true,"profileUrl":true,"username":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":135}]},{"name":"profileUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":142,"b":152}]},{"name":"username","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":167}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":274}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":298,"b":312}]}],"statement":"INSERT INTO friends.friend_social_profiles (\n    friend_id,\n    platform,\n    profile_url,\n    username\n)\nSELECT\n    c.id,\n    :platform,\n    :profileUrl,\n    :username\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    external_id,\n    platform,\n    profile_url,\n    username,\n    created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_social_profiles (
 *     friend_id,
 *     platform,
 *     profile_url,
 *     username
 * )
 * SELECT
 *     c.id,
 *     :platform,
 *     :profileUrl,
 *     :username
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE c.external_id = :friendExternalId
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
  friendExternalId?: string | null | void;
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

const updateSocialProfileIR: any = {"usedParamSet":{"platform":true,"profileUrl":true,"username":true,"profileExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"platform","required":false,"transform":{"type":"scalar"},"locs":[{"a":60,"b":68}]},{"name":"profileUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":89,"b":99}]},{"name":"username","required":false,"transform":{"type":"scalar"},"locs":[{"a":117,"b":125}]},{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":217,"b":234}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":300}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":324,"b":338}]}],"statement":"UPDATE friends.friend_social_profiles sp\nSET\n    platform = :platform,\n    profile_url = :profileUrl,\n    username = :username\nFROM friends.friends c\nINNER JOIN auth.users u ON c.user_id = u.id\nWHERE sp.external_id = :profileExternalId\n  AND sp.friend_id = c.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING\n    sp.external_id,\n    sp.platform,\n    sp.profile_url,\n    sp.username,\n    sp.created_at"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_social_profiles sp
 * SET
 *     platform = :platform,
 *     profile_url = :profileUrl,
 *     username = :username
 * FROM friends.friends c
 * INNER JOIN auth.users u ON c.user_id = u.id
 * WHERE sp.external_id = :profileExternalId
 *   AND sp.friend_id = c.id
 *   AND c.external_id = :friendExternalId
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
  friendExternalId?: string | null | void;
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

const deleteSocialProfileIR: any = {"usedParamSet":{"profileExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"profileExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":107,"b":124}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":197,"b":213}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":237,"b":251}]}],"statement":"DELETE FROM friends.friend_social_profiles sp\nUSING friends.friends c, auth.users u\nWHERE sp.external_id = :profileExternalId\n  AND sp.friend_id = c.id\n  AND c.user_id = u.id\n  AND c.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND c.deleted_at IS NULL\nRETURNING sp.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_social_profiles sp
 * USING friends.friends c, auth.users u
 * WHERE sp.external_id = :profileExternalId
 *   AND sp.friend_id = c.id
 *   AND c.user_id = u.id
 *   AND c.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND c.deleted_at IS NULL
 * RETURNING sp.external_id
 * ```
 */
export const deleteSocialProfile = new PreparedQuery<IDeleteSocialProfileParams,IDeleteSocialProfileResult>(deleteSocialProfileIR);


