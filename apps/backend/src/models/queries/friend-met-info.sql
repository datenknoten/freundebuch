/* @name GetMetInfoByFriendId */
SELECT
    m.external_id,
    m.met_date,
    m.met_location,
    m.met_context,
    m.created_at,
    m.updated_at
FROM friends.friend_met_info m
INNER JOIN friends.friends c ON m.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name UpsertMetInfo */
INSERT INTO friends.friend_met_info (
    friend_id,
    met_date,
    met_location,
    met_context
)
SELECT
    c.id,
    :metDate::date,
    :metLocation,
    :metContext
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ON CONFLICT (friend_id)
DO UPDATE SET
    met_date = :metDate::date,
    met_location = :metLocation,
    met_context = :metContext,
    updated_at = CURRENT_TIMESTAMP
RETURNING
    external_id,
    met_date,
    met_location,
    met_context,
    created_at,
    updated_at;

/* @name DeleteMetInfo */
DELETE FROM friends.friend_met_info m
USING friends.friends c, auth.users u
WHERE m.friend_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING m.external_id;
