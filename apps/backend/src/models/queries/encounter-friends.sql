/* @name SetEncounterFriends */
-- Adds friends to an encounter (call ClearEncounterFriends first to replace all)
-- Returns the inserted friend data to avoid an extra query
INSERT INTO encounters.encounter_friends (encounter_id, friend_id)
SELECT e.id, f.id
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
INNER JOIN friends.friends f ON f.user_id = u.id
WHERE e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.external_id = ANY(:friendExternalIds::uuid[])
  AND f.deleted_at IS NULL
ON CONFLICT (encounter_id, friend_id) DO NOTHING
RETURNING
    (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,
    (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,
    (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url;

/* @name ClearEncounterFriends */
-- Removes all friend assignments for an encounter (used before setting new friends)
DELETE FROM encounters.encounter_friends ef
USING encounters.encounters e, auth.users u
WHERE ef.encounter_id = e.id
  AND e.user_id = u.id
  AND e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid;

/* @name AddFriendToEncounter */
INSERT INTO encounters.encounter_friends (encounter_id, friend_id)
SELECT e.id, f.id
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
INNER JOIN friends.friends f ON f.user_id = u.id
WHERE e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.external_id = :friendExternalId::uuid
  AND f.deleted_at IS NULL
ON CONFLICT (encounter_id, friend_id) DO NOTHING
RETURNING
    (SELECT external_id FROM friends.friends WHERE id = friend_id) AS friend_external_id,
    (SELECT COALESCE(display_name, nickname, 'Unknown') FROM friends.friends WHERE id = friend_id) AS friend_display_name,
    (SELECT photo_url FROM friends.friends WHERE id = friend_id) AS friend_photo_url;

/* @name RemoveFriendFromEncounter */
DELETE FROM encounters.encounter_friends ef
USING encounters.encounters e, auth.users u, friends.friends f
WHERE ef.encounter_id = e.id
  AND ef.friend_id = f.id
  AND e.user_id = u.id
  AND e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.external_id = :friendExternalId::uuid
RETURNING ef.id;

/* @name GetFriendEncounterCount */
-- Gets count of encounters for a specific friend
SELECT COUNT(DISTINCT e.id)::int AS encounter_count
FROM encounters.encounters e
INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
INNER JOIN friends.friends f ON ef.friend_id = f.id
INNER JOIN auth.users u ON e.user_id = u.id
WHERE f.external_id = :friendExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL;
