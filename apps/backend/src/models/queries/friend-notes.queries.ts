/** Types generated for queries found in "src/models/queries/friend-notes.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetFriendNotes' parameters type */
export interface IGetFriendNotesParams {
  friendExternalId?: string | null | void;
  noteExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendNotes' return type */
export interface IGetFriendNotesResult {
  content: string;
  created_at: Date;
  /** Date when the encounter occurred */
  encounter_date: Date | null;
  /** Public UUID for API exposure (always use this in APIs) */
  encounter_external_id: string | null;
  /** Title/name of the encounter (e.g., "Coffee at Starbucks", "Birthday Party") */
  encounter_title: string | null;
  /** Kind of contact: 'in_person', 'phone_call', 'video_call' or 'message' */
  encounter_type: string | null;
  external_id: string;
  /** Primary name shown in lists */
  source_friend_display_name: string | null;
  /** Public UUID for API exposure (always use this in APIs) */
  source_friend_external_id: string | null;
  /** URL to 200x200 thumbnail */
  source_friend_photo_thumbnail_url: string | null;
  superseded_by_note_external_id: string | null;
  supersedes_note_external_id: string | null;
  updated_at: Date;
}

/** 'GetFriendNotes' query type */
export interface IGetFriendNotesQuery {
  params: IGetFriendNotesParams;
  result: IGetFriendNotesResult;
}

const getFriendNotesIR: any = {"usedParamSet":{"friendExternalId":true,"userExternalId":true,"noteExternalId":true},"params":[{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":924,"b":940}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":964,"b":978}]},{"name":"noteExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1014,"b":1028},{"a":1063,"b":1077}]}],"statement":"SELECT\n  n.external_id,\n  n.content,\n  n.created_at,\n  n.updated_at,\n  e.external_id AS \"encounter_external_id?\",\n  e.title AS \"encounter_title?\",\n  e.encounter_type AS \"encounter_type?\",\n  e.encounter_date AS \"encounter_date?\",\n  sf.external_id AS \"source_friend_external_id?\",\n  sf.display_name AS \"source_friend_display_name?\",\n  sf.photo_thumbnail_url AS \"source_friend_photo_thumbnail_url?\",\n  sn.external_id AS \"supersedes_note_external_id?\",\n  nn.external_id AS \"superseded_by_note_external_id?\"\nFROM friends.friend_notes n\nINNER JOIN friends.friends f ON n.friend_id = f.id\nINNER JOIN auth.users u ON f.user_id = u.id\nLEFT JOIN encounters.encounters e ON e.id = n.encounter_id\nLEFT JOIN friends.friends sf ON sf.id = n.source_friend_id AND sf.deleted_at IS NULL\nLEFT JOIN friends.friend_notes sn ON sn.id = n.supersedes_note_id\nLEFT JOIN friends.friend_notes nn ON nn.supersedes_note_id = n.id\nWHERE f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\n  AND (:noteExternalId::uuid IS NULL OR n.external_id = :noteExternalId::uuid)\nORDER BY n.created_at DESC, n.id DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   n.external_id,
 *   n.content,
 *   n.created_at,
 *   n.updated_at,
 *   e.external_id AS "encounter_external_id?",
 *   e.title AS "encounter_title?",
 *   e.encounter_type AS "encounter_type?",
 *   e.encounter_date AS "encounter_date?",
 *   sf.external_id AS "source_friend_external_id?",
 *   sf.display_name AS "source_friend_display_name?",
 *   sf.photo_thumbnail_url AS "source_friend_photo_thumbnail_url?",
 *   sn.external_id AS "supersedes_note_external_id?",
 *   nn.external_id AS "superseded_by_note_external_id?"
 * FROM friends.friend_notes n
 * INNER JOIN friends.friends f ON n.friend_id = f.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * LEFT JOIN encounters.encounters e ON e.id = n.encounter_id
 * LEFT JOIN friends.friends sf ON sf.id = n.source_friend_id AND sf.deleted_at IS NULL
 * LEFT JOIN friends.friend_notes sn ON sn.id = n.supersedes_note_id
 * LEFT JOIN friends.friend_notes nn ON nn.supersedes_note_id = n.id
 * WHERE f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 *   AND (:noteExternalId::uuid IS NULL OR n.external_id = :noteExternalId::uuid)
 * ORDER BY n.created_at DESC, n.id DESC
 * ```
 */
export const getFriendNotes = new PreparedQuery<IGetFriendNotesParams,IGetFriendNotesResult>(getFriendNotesIR);


/** 'GetFriendNoteInternalId' parameters type */
export interface IGetFriendNoteInternalIdParams {
  friendExternalId?: string | null | void;
  noteExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'GetFriendNoteInternalId' return type */
export interface IGetFriendNoteInternalIdResult {
  id: number;
}

/** 'GetFriendNoteInternalId' query type */
export interface IGetFriendNoteInternalIdQuery {
  params: IGetFriendNoteInternalIdParams;
  result: IGetFriendNoteInternalIdResult;
}

const getFriendNoteInternalIdIR: any = {"usedParamSet":{"noteExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"noteExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":171}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":217}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":255}]}],"statement":"SELECT n.id\nFROM friends.friend_notes n\nINNER JOIN friends.friends f ON n.friend_id = f.id\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE n.external_id = :noteExternalId::uuid\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT n.id
 * FROM friends.friend_notes n
 * INNER JOIN friends.friends f ON n.friend_id = f.id
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE n.external_id = :noteExternalId::uuid
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * ```
 */
export const getFriendNoteInternalId = new PreparedQuery<IGetFriendNoteInternalIdParams,IGetFriendNoteInternalIdResult>(getFriendNoteInternalIdIR);


/** 'CreateFriendNote' parameters type */
export interface ICreateFriendNoteParams {
  content?: string | null | void;
  encounterId?: number | null | void;
  friendId?: number | null | void;
  sourceFriendId?: number | null | void;
  supersedesNoteId?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'CreateFriendNote' return type */
export interface ICreateFriendNoteResult {
  external_id: string;
}

/** 'CreateFriendNote' query type */
export interface ICreateFriendNoteQuery {
  params: ICreateFriendNoteParams;
  result: ICreateFriendNoteResult;
}

const createFriendNoteIR: any = {"usedParamSet":{"content":true,"encounterId":true,"sourceFriendId":true,"supersedesNoteId":true,"friendId":true,"userExternalId":true},"params":[{"name":"content","required":false,"transform":{"type":"scalar"},"locs":[{"a":119,"b":126}]},{"name":"encounterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":129,"b":140}]},{"name":"sourceFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":157}]},{"name":"supersedesNoteId","required":false,"transform":{"type":"scalar"},"locs":[{"a":160,"b":176}]},{"name":"friendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":266}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":290,"b":304}]}],"statement":"INSERT INTO friends.friend_notes (friend_id, content, encounter_id, source_friend_id, supersedes_note_id)\nSELECT f.id, :content, :encounterId, :sourceFriendId, :supersedesNoteId\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE f.id = :friendId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING external_id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO friends.friend_notes (friend_id, content, encounter_id, source_friend_id, supersedes_note_id)
 * SELECT f.id, :content, :encounterId, :sourceFriendId, :supersedesNoteId
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE f.id = :friendId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING external_id
 * ```
 */
export const createFriendNote = new PreparedQuery<ICreateFriendNoteParams,ICreateFriendNoteResult>(createFriendNoteIR);


/** 'UpdateFriendNote' parameters type */
export interface IUpdateFriendNoteParams {
  content?: string | null | void;
  encounterId?: number | null | void;
  friendId?: number | null | void;
  noteId?: number | null | void;
  sourceFriendId?: number | null | void;
  supersedesNoteId?: number | null | void;
  userExternalId?: string | null | void;
}

/** 'UpdateFriendNote' return type */
export interface IUpdateFriendNoteResult {
  external_id: string;
}

/** 'UpdateFriendNote' query type */
export interface IUpdateFriendNoteQuery {
  params: IUpdateFriendNoteParams;
  result: IUpdateFriendNoteResult;
}

const updateFriendNoteIR: any = {"usedParamSet":{"content":true,"encounterId":true,"sourceFriendId":true,"supersedesNoteId":true,"noteId":true,"friendId":true,"userExternalId":true},"params":[{"name":"content","required":false,"transform":{"type":"scalar"},"locs":[{"a":44,"b":51}]},{"name":"encounterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":73,"b":84}]},{"name":"sourceFriendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":110,"b":124}]},{"name":"supersedesNoteId","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":168}]},{"name":"noteId","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":256}]},{"name":"friendId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":304}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":342}]}],"statement":"UPDATE friends.friend_notes n\nSET content = :content,\n    encounter_id = :encounterId,\n    source_friend_id = :sourceFriendId,\n    supersedes_note_id = :supersedesNoteId\nFROM friends.friends f\nINNER JOIN auth.users u ON f.user_id = u.id\nWHERE n.id = :noteId\n  AND n.friend_id = f.id\n  AND f.id = :friendId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING n.external_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE friends.friend_notes n
 * SET content = :content,
 *     encounter_id = :encounterId,
 *     source_friend_id = :sourceFriendId,
 *     supersedes_note_id = :supersedesNoteId
 * FROM friends.friends f
 * INNER JOIN auth.users u ON f.user_id = u.id
 * WHERE n.id = :noteId
 *   AND n.friend_id = f.id
 *   AND f.id = :friendId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING n.external_id
 * ```
 */
export const updateFriendNote = new PreparedQuery<IUpdateFriendNoteParams,IUpdateFriendNoteResult>(updateFriendNoteIR);


/** 'DeleteFriendNote' parameters type */
export interface IDeleteFriendNoteParams {
  friendExternalId?: string | null | void;
  noteExternalId?: string | null | void;
  userExternalId?: string | null | void;
}

/** 'DeleteFriendNote' return type */
export interface IDeleteFriendNoteResult {
  external_id: string;
}

/** 'DeleteFriendNote' query type */
export interface IDeleteFriendNoteQuery {
  params: IDeleteFriendNoteParams;
  result: IDeleteFriendNoteResult;
}

const deleteFriendNoteIR: any = {"usedParamSet":{"noteExternalId":true,"friendExternalId":true,"userExternalId":true},"params":[{"name":"noteExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":95,"b":109}]},{"name":"friendExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":187,"b":203}]},{"name":"userExternalId","required":false,"transform":{"type":"scalar"},"locs":[{"a":227,"b":241}]}],"statement":"DELETE FROM friends.friend_notes n\nUSING friends.friends f, auth.users u\nWHERE n.external_id = :noteExternalId::uuid\n  AND n.friend_id = f.id\n  AND f.user_id = u.id\n  AND f.external_id = :friendExternalId\n  AND u.external_id = :userExternalId\n  AND f.deleted_at IS NULL\nRETURNING n.external_id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM friends.friend_notes n
 * USING friends.friends f, auth.users u
 * WHERE n.external_id = :noteExternalId::uuid
 *   AND n.friend_id = f.id
 *   AND f.user_id = u.id
 *   AND f.external_id = :friendExternalId
 *   AND u.external_id = :userExternalId
 *   AND f.deleted_at IS NULL
 * RETURNING n.external_id
 * ```
 */
export const deleteFriendNote = new PreparedQuery<IDeleteFriendNoteParams,IDeleteFriendNoteResult>(deleteFriendNoteIR);


