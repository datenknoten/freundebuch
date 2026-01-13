/* @name GetCirclesByFriendId */
SELECT
    c.external_id,
    c.name,
    c.color
FROM friends.circles c
INNER JOIN friends.friend_circles fc ON fc.circle_id = c.id
INNER JOIN friends.friends f ON fc.friend_id = f.id
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
ORDER BY c.sort_order ASC, c.name ASC;

/* @name AddFriendToCircle */
INSERT INTO friends.friend_circles (friend_id, circle_id)
SELECT f.id, c.id
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
INNER JOIN friends.circles c ON c.user_id = u.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.external_id = :circleExternalId
  AND f.deleted_at IS NULL
ON CONFLICT (friend_id, circle_id) DO NOTHING
RETURNING
    (SELECT external_id FROM friends.circles WHERE id = circle_id) AS circle_external_id,
    (SELECT name FROM friends.circles WHERE id = circle_id) AS circle_name,
    (SELECT color FROM friends.circles WHERE id = circle_id) AS circle_color;

/* @name RemoveFriendFromCircle */
DELETE FROM friends.friend_circles fc
USING friends.friends f, auth.users u, friends.circles c
WHERE fc.friend_id = f.id
  AND fc.circle_id = c.id
  AND f.user_id = u.id
  AND c.user_id = u.id
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.external_id = :circleExternalId
  AND f.deleted_at IS NULL
RETURNING fc.id;

/* @name ClearFriendCircles */
-- Removes all circle assignments for a friend (used before setting new circles)
DELETE FROM friends.friend_circles fc
USING friends.friends f, auth.users u
WHERE fc.friend_id = f.id
  AND f.user_id = u.id
  AND f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL;

/* @name SetFriendCircles */
-- Adds a friend to multiple circles at once (call ClearFriendCircles first to replace all)
-- Returns the inserted circle data to avoid an extra query
INSERT INTO friends.friend_circles (friend_id, circle_id)
SELECT f.id, c.id
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
INNER JOIN friends.circles c ON c.user_id = u.id
WHERE f.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.external_id = ANY(:circleExternalIds::uuid[])
  AND f.deleted_at IS NULL
ON CONFLICT (friend_id, circle_id) DO NOTHING
RETURNING
    (SELECT external_id FROM friends.circles WHERE id = circle_id) AS circle_external_id,
    (SELECT name FROM friends.circles WHERE id = circle_id) AS circle_name,
    (SELECT color FROM friends.circles WHERE id = circle_id) AS circle_color;

/* @name GetFriendIdsByCircle */
-- Gets all friend IDs in a circle (for faceted search)
SELECT f.id
FROM friends.friends f
INNER JOIN friends.friend_circles fc ON fc.friend_id = f.id
INNER JOIN friends.circles c ON fc.circle_id = c.id
INNER JOIN auth.users u ON f.user_id = u.id
WHERE c.external_id = :circleExternalId
  AND u.external_id = :userExternalId
  AND f.deleted_at IS NULL
  AND f.archived_at IS NULL;

/* @name GetCircleFacetCounts */
-- Gets circle facet counts for search results
SELECT
    c.external_id AS value,
    c.name AS label,
    c.color,
    COUNT(DISTINCT fc.friend_id)::int AS count
FROM friends.circles c
INNER JOIN auth.users u ON c.user_id = u.id
LEFT JOIN friends.friend_circles fc ON fc.circle_id = c.id
LEFT JOIN friends.friends f ON fc.friend_id = f.id AND f.deleted_at IS NULL AND f.archived_at IS NULL
WHERE u.external_id = :userExternalId
GROUP BY c.id, c.external_id, c.name, c.color
ORDER BY c.sort_order ASC, c.name ASC;
