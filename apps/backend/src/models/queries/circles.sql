/* @name GetCirclesByUserId */
SELECT
    c.external_id,
    c.name,
    c.color,
    pc.external_id AS parent_circle_external_id,
    c.sort_order,
    c.created_at,
    c.updated_at,
    COUNT(fc.id)::int AS friend_count
FROM friends.circles c
INNER JOIN auth.users u ON c.user_id = u.id
LEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id
LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
WHERE u.external_id = :userExternalId
GROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at
ORDER BY c.sort_order ASC, c.name ASC;

/* @name GetCircleById */
SELECT
    c.external_id,
    c.name,
    c.color,
    pc.external_id AS parent_circle_external_id,
    c.sort_order,
    c.created_at,
    c.updated_at,
    COUNT(fc.id)::int AS friend_count
FROM friends.circles c
INNER JOIN auth.users u ON c.user_id = u.id
LEFT JOIN friends.circles pc ON c.parent_circle_id = pc.id
LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
WHERE c.external_id = :circleExternalId
  AND u.external_id = :userExternalId
GROUP BY c.id, c.external_id, c.name, c.color, pc.external_id, c.sort_order, c.created_at, c.updated_at;

/* @name CreateCircle */
INSERT INTO friends.circles (
    user_id,
    name,
    color,
    parent_circle_id,
    sort_order
)
SELECT
    u.id,
    :name,
    :color,
    pc.id,
    COALESCE(:sortOrder, 0)
FROM auth.users u
LEFT JOIN friends.circles pc ON pc.external_id = :parentCircleExternalId AND pc.user_id = u.id
WHERE u.external_id = :userExternalId
RETURNING
    external_id,
    name,
    color,
    (SELECT external_id FROM friends.circles WHERE id = parent_circle_id) AS parent_circle_external_id,
    sort_order,
    created_at,
    updated_at;

/* @name UpdateCircle */
-- Note: parentCircleExternalId = '__KEEP__' means don't change parent, NULL means remove parent
UPDATE friends.circles c
SET
    name = COALESCE(:name, c.name),
    color = COALESCE(:color, c.color),
    parent_circle_id = CASE
        WHEN :parentCircleExternalId = '__KEEP__' THEN c.parent_circle_id
        WHEN :parentCircleExternalId IS NULL THEN NULL
        ELSE (
            SELECT pc.id FROM friends.circles pc
            WHERE pc.external_id = :parentCircleExternalId
              AND pc.user_id = c.user_id
        )
    END,
    sort_order = COALESCE(:sortOrder, c.sort_order),
    updated_at = current_timestamp
FROM auth.users u
WHERE c.external_id = :circleExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
RETURNING
    c.external_id,
    c.name,
    c.color,
    (SELECT pc.external_id FROM friends.circles pc WHERE pc.id = c.parent_circle_id) AS parent_circle_external_id,
    c.sort_order,
    c.created_at,
    c.updated_at;

/* @name DeleteCircle */
DELETE FROM friends.circles c
USING auth.users u
WHERE c.external_id = :circleExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
RETURNING c.external_id;

/* @name UpdateCircleSortOrder */
UPDATE friends.circles c
SET
    sort_order = :sortOrder,
    updated_at = current_timestamp
FROM auth.users u
WHERE c.external_id = :circleExternalId
  AND c.user_id = u.id
  AND u.external_id = :userExternalId
RETURNING c.external_id;

/* @name MergeCircles */
-- Moves all friends from source circle to target circle (deletion done separately)
UPDATE friends.friend_circles fc
SET circle_id = (
    SELECT tc.id FROM friends.circles tc
    INNER JOIN auth.users u ON tc.user_id = u.id
    WHERE tc.external_id = :targetCircleExternalId
      AND u.external_id = :userExternalId
)
FROM friends.circles sc
INNER JOIN auth.users u ON sc.user_id = u.id
WHERE fc.circle_id = sc.id
  AND sc.external_id = :sourceCircleExternalId
  AND u.external_id = :userExternalId
  -- Avoid duplicates: only move if not already in target circle
  AND NOT EXISTS (
    SELECT 1 FROM friends.friend_circles existing
    INNER JOIN friends.circles tc ON existing.circle_id = tc.id
    WHERE existing.friend_id = fc.friend_id
      AND tc.external_id = :targetCircleExternalId
  );

/* @name GetCircleInternalId */
-- Helper to get internal ID for a circle (used for merge operations)
SELECT c.id
FROM friends.circles c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :circleExternalId
  AND u.external_id = :userExternalId;
