/* @name GetFriendNotes */
SELECT
  n.external_id,
  n.content,
  n.created_at,
  n.updated_at,
  e.external_id AS "encounter_external_id?",
  e.title AS "encounter_title?",
  e.encounter_type AS "encounter_type?",
  e.encounter_date AS "encounter_date?",
  sf.external_id AS "source_friend_external_id?",
  sf.display_name AS "source_friend_display_name?",
  sf.photo_thumbnail_url AS "source_friend_photo_thumbnail_url?",
  sn.external_id AS "supersedes_note_external_id?",
  nn.external_id AS "superseded_by_note_external_id?"
FROM friends.friend_notes n
INNER JOIN friends.friends f ON n.friend_id = f.id
INNER JOIN auth.users u ON f.user_id = u.id
LEFT JOIN encounters.encounters e ON e.id = n.encounter_id
LEFT JOIN friends.friends sf ON sf.id = n.source_friend_id AND sf.deleted_at IS NULL
LEFT JOIN friends.friend_notes sn ON sn.id = n.supersedes_note_id
LEFT JOIN friends.friend_notes nn ON nn.supersedes_note_id = n.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
  AND (:noteExternalId::uuid IS NULL OR n.external_id = :noteExternalId::uuid)
ORDER BY n.created_at DESC, n.id DESC;

/* @name GetFriendNoteInternalId */
SELECT n.id
FROM friends.friend_notes n
INNER JOIN friends.friends f ON n.friend_id = f.id
INNER JOIN auth.users u ON f.user_id = u.id
WHERE n.external_id = :noteExternalId::uuid
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL;

/* @name CreateFriendNote */
INSERT INTO friends.friend_notes (friend_id, content, encounter_id, source_friend_id, supersedes_note_id)
SELECT f.id, :content, :encounterId, :sourceFriendId, :supersedesNoteId
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.id = :friendId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING external_id;

/* @name UpdateFriendNote */
UPDATE friends.friend_notes n
SET content = :content,
    encounter_id = :encounterId,
    source_friend_id = :sourceFriendId,
    supersedes_note_id = :supersedesNoteId
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE n.id = :noteId
  AND n.friend_id = f.id
  AND f.id = :friendId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING n.external_id;

/* @name DeleteFriendNote */
DELETE FROM friends.friend_notes n
USING friends.friends f, auth.users u
WHERE n.external_id = :noteExternalId::uuid
  AND n.friend_id = f.id
  AND f.user_id = u.id
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
RETURNING n.external_id;
