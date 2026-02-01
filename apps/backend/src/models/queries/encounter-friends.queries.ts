/** Types generated for queries found in "src/models/queries/encounter-friends.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'SetEncounterFriends' parameters type */
export interface ISetEncounterFriendsParams {
  encounterExternalId?: string | null | void;
  friendExternalIds?: stringArray | null | void;
  userExternalId?: string | null | void;
}

/** 'SetEncounterFriends' return type */
export interface ISetEncounterFriendsResult {
  friend_display_name: string | null;
  friend_external_id: string | null;
  friend_photo_url: string | null;
}

/** 'SetEncounterFriends' query type */
export interface ISetEncounterFriendsQuery {
  params: ISetEncounterFriendsParams;
  result: ISetEncounterFriendsResult;
}

const setEncounterFriendsIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true,"friendExternalIds":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":390}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":420,"b":434}]},{"name":"friendExternalIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":468,"b":485}]}],"statement":"-- Adds friends to an encounter (call ClearEncounterFriends first to replace all)\n-- Returns the inserted friend data to avoid an extra query\nINSERT INTO encounters.encounter_friends (encounter_id, friend_id)\nSELECT e.id, f.id\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nINNER JOIN friends.friends f ON f.user_id = u.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.external_id = ANY(:friendExternalIds::uuid[])\n  AND f.deleted_at IS NULL\nON CONFLICT (encounter_id, friend_id) DO NOTHING\nRETURNING\n    (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,\n    (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,\n    (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url"};

/**
 * Query generated from SQL:
 * ```
 * -- Adds friends to an encounter (call ClearEncounterFriends first to replace all)
 * -- Returns the inserted friend data to avoid an extra query
 * INSERT INTO encounters.encounter_friends (encounter_id, friend_id)
 * SELECT e.id, f.id
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * INNER JOIN friends.friends f ON f.user_id = u.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.external_id = ANY(:friendExternalIds::uuid[])
 *   AND f.deleted_at IS NULL
 * ON CONFLICT (encounter_id, friend_id) DO NOTHING
 * RETURNING
 *     (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,
 *     (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,
 *     (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url
 * ```
 */
export const setEncounterFriends = new PreparedQuery<ISetEncounterFriendsParams,ISetEncounterFriendsResult>(setEncounterFriendsIR);


/** 'ClearEncounterFriends' parameters type */
export interface IClearEncounterFriendsParams {
  encounterExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'ClearEncounterFriends' return type */
export type IClearEncounterFriendsResult = void;

/** 'ClearEncounterFriends' query type */
export interface IClearEncounterFriendsQuery {
  params: IClearEncounterFriendsParams;
  result: IClearEncounterFriendsResult;
}

const clearEncounterFriendsIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":266}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":310}]}],"statement":"-- Removes all friend assignments for an encounter (used before setting new friends)\nDELETE FROM encounters.encounter_friends ef\nUSING encounters.encounters e, auth.users u\nWHERE ef.encounter_id = e.id\n  AND e.user_id = u.id\n  AND e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Removes all friend assignments for an encounter (used before setting new friends)
 * DELETE FROM encounters.encounter_friends ef
 * USING encounters.encounters e, auth.users u
 * WHERE ef.encounter_id = e.id
 *   AND e.user_id = u.id
 *   AND e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 * ```
 */
export const clearEncounterFriends = new PreparedQuery<IClearEncounterFriendsParams,IClearEncounterFriendsResult>(clearEncounterFriendsIR);


/** 'AddFriendToEncounter' parameters type */
export interface IAddFriendToEncounterParams {
  encounterExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'AddFriendToEncounter' return type */
export interface IAddFriendToEncounterResult {
  friend_display_name: string | null;
  friend_external_id: string | null;
  friend_photo_url: string | null;
}

/** 'AddFriendToEncounter' query type */
export interface IAddFriendToEncounterQuery {
  params: IAddFriendToEncounterParams;
  result: IAddFriendToEncounterResult;
}

const addFriendToEncounterIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true,"friendExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":248}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":292}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":322,"b":338}]}],"statement":"INSERT INTO encounters.encounter_friends (encounter_id, friend_id)\nSELECT e.id, f.id\nFROM encounters.encounters e\nINNER JOIN auth.users u ON e.user_id = u.id\nINNER JOIN friends.friends f ON f.user_id = u.id\nWHERE e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.external_id = :friendExternalId::uuid\n  AND f.deleted_at IS NULL\nON CONFLICT (encounter_id, friend_id) DO NOTHING\nRETURNING\n    (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,\n    (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,\n    (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO encounters.encounter_friends (encounter_id, friend_id)
 * SELECT e.id, f.id
 * FROM encounters.encounters e
 * INNER JOIN auth.users u ON e.user_id = u.id
 * INNER JOIN friends.friends f ON f.user_id = u.id
 * WHERE e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.external_id = :friendExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ON CONFLICT (encounter_id, friend_id) DO NOTHING
 * RETURNING
 *     (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,
 *     (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,
 *     (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url
 * ```
 */
export const addFriendToEncounter = new PreparedQuery<IAddFriendToEncounterParams,IAddFriendToEncounterResult>(addFriendToEncounterIR);


/** 'RemoveFriendFromEncounter' parameters type */
export interface IRemoveFriendFromEncounterParams {
  encounterExternalId?: string | null | void;
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'RemoveFriendFromEncounter' return type */
export interface IRemoveFriendFromEncounterResult {
  /** Internal sequential ID */
  id: number;
}

/** 'RemoveFriendFromEncounter' query type */
export interface IRemoveFriendFromEncounterQuery {
  params: IRemoveFriendFromEncounterParams;
  result: IRemoveFriendFromEncounterResult;
}

const removeFriendFromEncounterIR: any = {"usedParamSet":{"encounterExternalId":true,"userExternalId":true,"friendExternalId":true},"params":[{"name":"encounterExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":226}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":256,"b":270}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":316}]}],"statement":"DELETE FROM encounters.encounter_friends ef\nUSING encounters.encounters e, auth.users u, friends.friends f\nWHERE ef.encounter_id = e.id\n  AND ef.friend_id = f.id\n  AND e.user_id = u.id\n  AND e.external_id = :encounterExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.external_id = :friendExternalId::uuid\nRETURNING ef.id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM encounters.encounter_friends ef
 * USING encounters.encounters e, auth.users u, friends.friends f
 * WHERE ef.encounter_id = e.id
 *   AND ef.friend_id = f.id
 *   AND e.user_id = u.id
 *   AND e.external_id = :encounterExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.external_id = :friendExternalId::uuid
 * RETURNING ef.id
 * ```
 */
export const removeFriendFromEncounter = new PreparedQuery<IRemoveFriendFromEncounterParams,IRemoveFriendFromEncounterResult>(removeFriendFromEncounterIR);


/** 'GetFriendEncounterCount' parameters type */
export interface IGetFriendEncounterCountParams {
  friendExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendEncounterCount' return type */
export interface IGetFriendEncounterCountResult {
  encounter_count: number | null;
}

/** 'GetFriendEncounterCount' query type */
export interface IGetFriendEncounterCountQuery {
  params: IGetFriendEncounterCountParams;
  result: IGetFriendEncounterCountResult;
}

const getFriendEncounterCountIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":334}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":364,"b":378}]}],"statement":"-- Gets count of encounters for a specific friend\nSELECT COUNT(DISTINCT e.id)::int AS encounter_count\nFROM encounters.encounters e\nINNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id\nINNER JOIN friends.friends f ON ef.friend_id = f.id\nINNER JOIN auth.users u ON e.user_id = u.id\nWHERE f.external_id = :friendExternalId::uuid\n  AND u.external_id = :userExternalId::uuid\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- Gets count of encounters for a specific friend
 * SELECT COUNT(DISTINCT e.id)::int AS encounter_count
 * FROM encounters.encounters e
 * INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
 * INNER JOIN friends.friends f ON ef.friend_id = f.id
 * INNER JOIN auth.users u ON e.user_id = u.id
 * WHERE f.external_id = :friendExternalId::uuid
 *   AND u.external_id = :userExternalId::uuid
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getFriendEncounterCount = new PreparedQuery<IGetFriendEncounterCountParams,IGetFriendEncounterCountResult>(getFriendEncounterCountIR);


