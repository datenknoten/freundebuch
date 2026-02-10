/* @name GetCirclesByCollectiveId */
SELECT
    cr.external_id AS circle_external_id,
    cr.name AS circle_name,
    cr.color AS circle_color,
    ccm.created_at
FROM collectives.collective_circle_memberships ccm
INNER JOIN collectives.collectives c ON ccm.collective_id = c.id
INNER JOIN friends.circles cr ON ccm.circle_id = cr.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
ORDER BY cr.name ASC;

/* @name AddToCircle */
INSERT INTO collectives.collective_circle_memberships (
    collective_id,
    circle_id
)
SELECT
    c.id,
    cr.id
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN friends.circles cr ON cr.user_id = u.id
WHERE c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND cr.external_id = :circleExternalId
  AND c.deleted_at IS NULL
ON CONFLICT (collective_id, circle_id) DO NOTHING
RETURNING (
    SELECT cr2.external_id
    FROM friends.circles cr2
    WHERE cr2.id = collective_circle_memberships.circle_id
) AS circle_external_id;

/* @name RemoveFromCircle */
DELETE FROM collectives.collective_circle_memberships ccm
USING collectives.collectives c, auth.users u, friends.circles cr
WHERE ccm.collective_id = c.id
  AND c.user_id = u.id
  AND ccm.circle_id = cr.id
  AND c.external_id = :collectiveExternalId
  AND u.external_id = :userExternalId
  AND cr.external_id = :circleExternalId
  AND c.deleted_at IS NULL
RETURNING cr.external_id;

/* @name GetAvailableCircles */
SELECT
    cr.external_id,
    cr.name,
    cr.color
FROM friends.circles cr
INNER JOIN auth.users u ON cr.user_id = u.id
WHERE u.external_id = :userExternalId
  AND NOT EXISTS (
    SELECT 1
    FROM collectives.collective_circle_memberships ccm
    INNER JOIN collectives.collectives c ON ccm.collective_id = c.id
    WHERE c.external_id = :collectiveExternalId
      AND ccm.circle_id = cr.id
      AND c.deleted_at IS NULL
  )
ORDER BY cr.name ASC;
