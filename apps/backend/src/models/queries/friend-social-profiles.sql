/* @name GetSocialProfilesByFriendId */
SELECT
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at
FROM friends.friend_social_profiles sp
INNER JOIN friends.friends c ON sp.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY sp.platform ASC, sp.created_at ASC;

/* @name GetSocialProfileById */
SELECT
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at
FROM friends.friend_social_profiles sp
INNER JOIN friends.friends c ON sp.friend_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE sp.external_id = :profileExternalId
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL;

/* @name CreateSocialProfile */
INSERT INTO friends.friend_social_profiles (
    friend_id,
    platform,
    profile_url,
    username
)
SELECT
    c.id,
    :platform,
    :profileUrl,
    :username
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    platform,
    profile_url,
    username,
    created_at;

/* @name UpdateSocialProfile */
UPDATE friends.friend_social_profiles sp
SET
    platform = :platform,
    profile_url = :profileUrl,
    username = :username
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE sp.external_id = :profileExternalId
  AND sp.friend_id = c.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    sp.external_id,
    sp.platform,
    sp.profile_url,
    sp.username,
    sp.created_at;

/* @name DeleteSocialProfile */
DELETE FROM friends.friend_social_profiles sp
USING friends.friends c, auth.users u
WHERE sp.external_id = :profileExternalId
  AND sp.friend_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING sp.external_id;
