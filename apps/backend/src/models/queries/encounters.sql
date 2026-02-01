/* @name GetEncountersByUserId */
SELECT
    e.external_id,
    e.title,
    e.encounter_date,
    e.location_text,
    e.description,
    e.created_at,
    e.updated_at,
    COUNT(DISTINCT ef.id)::int AS friend_count
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
LEFT JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
WHERE u.external_id = :userExternalId::uuid
  AND (
    :friendExternalId::uuid IS NULL
    OR EXISTS (
      SELECT 1 FROM encounters.encounter_friends ef2
      INNER JOIN friends.friends f ON ef2.friend_id = f.id
      WHERE ef2.encounter_id = e.id
        AND f.external_id = :friendExternalId::uuid
    )
  )
  AND (
    :fromDate::date IS NULL
    OR e.encounter_date >= :fromDate::date
  )
  AND (
    :toDate::date IS NULL
    OR e.encounter_date <= :toDate::date
  )
  AND (
    :search::text IS NULL
    OR e.title ILIKE '%' || :search || '%'
    OR e.description ILIKE '%' || :search || '%'
  )
GROUP BY e.id, e.external_id, e.title, e.encounter_date, e.location_text, e.description, e.created_at, e.updated_at
ORDER BY e.encounter_date DESC, e.created_at DESC
LIMIT :pageSize
OFFSET :offset;

/* @name CountEncountersByUserId */
SELECT COUNT(DISTINCT e.id)::int AS total_count
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
WHERE u.external_id = :userExternalId::uuid
  AND (
    :friendExternalId::uuid IS NULL
    OR EXISTS (
      SELECT 1 FROM encounters.encounter_friends ef
      INNER JOIN friends.friends f ON ef.friend_id = f.id
      WHERE ef.encounter_id = e.id
        AND f.external_id = :friendExternalId::uuid
    )
  )
  AND (
    :fromDate::date IS NULL
    OR e.encounter_date >= :fromDate::date
  )
  AND (
    :toDate::date IS NULL
    OR e.encounter_date <= :toDate::date
  )
  AND (
    :search::text IS NULL
    OR e.title ILIKE '%' || :search || '%'
    OR e.description ILIKE '%' || :search || '%'
  );

/* @name GetEncounterById */
SELECT
    e.external_id,
    e.title,
    e.encounter_date,
    e.location_text,
    e.description,
    e.created_at,
    e.updated_at
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
WHERE e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid;

/* @name GetEncounterFriends */
SELECT
    f.external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url
FROM friends.friends f
INNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id
INNER JOIN encounters.encounters e ON ef.encounter_id = e.id
INNER JOIN auth.users u ON e.user_id = u.id
WHERE e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL
ORDER BY display_name ASC;

/* @name GetEncounterFriendsPreview */
-- Gets first N friends for list preview
SELECT
    f.external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url
FROM friends.friends f
INNER JOIN encounters.encounter_friends ef ON ef.friend_id = f.id
INNER JOIN encounters.encounters e ON ef.encounter_id = e.id
WHERE e.external_id = :encounterExternalId::uuid
  AND f.deleted_at IS NULL
ORDER BY display_name ASC
LIMIT :limit;

/* @name CreateEncounter */
INSERT INTO encounters.encounters (
    user_id,
    title,
    encounter_date,
    location_text,
    description
)
SELECT
    u.id,
    :title,
    :encounterDate::date,
    :locationText,
    :description
FROM auth.users u
WHERE u.external_id = :userExternalId::uuid
RETURNING
    external_id,
    title,
    encounter_date,
    location_text,
    description,
    created_at,
    updated_at;

/* @name UpdateEncounter */
UPDATE encounters.encounters e
SET
    title = COALESCE(:title, e.title),
    encounter_date = COALESCE(:encounterDate::date, e.encounter_date),
    location_text = CASE
        WHEN :updateLocationText::boolean = true THEN :locationText
        ELSE e.location_text
    END,
    description = CASE
        WHEN :updateDescription::boolean = true THEN :description
        ELSE e.description
    END,
    updated_at = current_timestamp
FROM auth.users u
WHERE e.external_id = :encounterExternalId::uuid
  AND e.user_id = u.id
  AND u.external_id = :userExternalId::uuid
RETURNING
    e.external_id,
    e.title,
    e.encounter_date,
    e.location_text,
    e.description,
    e.created_at,
    e.updated_at;

/* @name DeleteEncounter */
DELETE FROM encounters.encounters e
USING auth.users u
WHERE e.external_id = :encounterExternalId::uuid
  AND e.user_id = u.id
  AND u.external_id = :userExternalId::uuid
RETURNING e.external_id;

/* @name GetLastEncounterForFriend */
SELECT
    e.external_id,
    e.title,
    e.encounter_date
FROM encounters.encounters e
INNER JOIN encounters.encounter_friends ef ON ef.encounter_id = e.id
INNER JOIN friends.friends f ON ef.friend_id = f.id
INNER JOIN auth.users u ON e.user_id = u.id
WHERE f.external_id = :friendExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL
ORDER BY e.encounter_date DESC, e.created_at DESC
LIMIT 1;

/* @name GetEncounterInternalId */
-- Helper to get internal ID for an encounter
SELECT e.id
FROM encounters.encounters e
INNER JOIN auth.users u ON e.user_id = u.id
WHERE e.external_id = :encounterExternalId::uuid
  AND u.external_id = :userExternalId::uuid;
