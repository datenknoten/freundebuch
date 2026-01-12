/* @name GetAllRelationshipTypes */
SELECT
    rt.id,
    rt.category,
    rt.label,
    rt.inverse_type_id
FROM friends.relationship_types rt
ORDER BY rt.category ASC, rt.label ASC;

/* @name GetRelationshipsByFriendId */
SELECT
    r.external_id,
    rc.external_id as related_friend_external_id,
    rc.display_name as related_friend_display_name,
    rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,
    r.relationship_type_id,
    rt.label as relationship_type_label,
    rt.category as relationship_category,
    r.notes,
    r.created_at
FROM friends.friend_relationships r
INNER JOIN friends.friends c ON r.friend_id = c.id
INNER JOIN friends.friends rc ON r.related_friend_id = rc.id
INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rc.deleted_at IS NULL
ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC;

/* @name GetRelationshipById */
SELECT
    r.external_id,
    rc.external_id as related_friend_external_id,
    rc.display_name as related_friend_display_name,
    rc.photo_thumbnail_url as related_friend_photo_thumbnail_url,
    r.relationship_type_id,
    rt.label as relationship_type_label,
    rt.category as relationship_category,
    r.notes,
    r.created_at
FROM friends.friend_relationships r
INNER JOIN friends.friends c ON r.friend_id = c.id
INNER JOIN friends.friends rc ON r.related_friend_id = rc.id
INNER JOIN friends.relationship_types rt ON r.relationship_type_id = rt.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE r.external_id = :relationshipExternalId
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rc.deleted_at IS NULL;

/* @name CreateRelationship */
INSERT INTO friends.friend_relationships (
    friend_id,
    related_friend_id,
    relationship_type_id,
    notes
)
SELECT
    c.id,
    rc.id,
    :relationshipTypeId,
    :notes
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    friend_id,
    related_friend_id,
    relationship_type_id,
    notes,
    created_at;

/* @name CreateInverseRelationship */
INSERT INTO friends.friend_relationships (
    friend_id,
    related_friend_id,
    relationship_type_id,
    notes
)
SELECT
    rc.id,
    c.id,
    rt.inverse_type_id,
    :notes
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN friends.friends rc ON rc.external_id = :relatedFriendExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
INNER JOIN friends.relationship_types rt ON rt.id = :relationshipTypeId
WHERE c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rt.inverse_type_id IS NOT NULL
RETURNING
    external_id,
    friend_id,
    related_friend_id,
    relationship_type_id,
    notes,
    created_at;

/* @name UpdateRelationship */
UPDATE friends.friend_relationships r
SET
    notes = :notes
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE r.external_id = :relationshipExternalId
  AND r.friend_id = c.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    r.external_id,
    r.relationship_type_id,
    r.notes,
    r.created_at;

/* @name DeleteRelationship */
DELETE FROM friends.friend_relationships r
USING friends.friends c, auth.users u
WHERE r.external_id = :relationshipExternalId
  AND r.friend_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :friendExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING r.external_id, r.related_friend_id, r.relationship_type_id;

/* @name DeleteInverseRelationship */
DELETE FROM friends.friend_relationships r
USING friends.friends c, friends.relationship_types rt
WHERE r.friend_id = :relatedFriendId
  AND r.related_friend_id = c.id
  AND r.relationship_type_id = rt.inverse_type_id
  AND rt.id = :relationshipTypeId
  AND c.id = (
    SELECT c2.id FROM friends.friends c2
    INNER JOIN auth.users u ON c2.user_id = u.id
    WHERE c2.external_id = :friendExternalId
      AND u.external_id = :userExternalId
      AND c2.deleted_at IS NULL
  )
RETURNING r.external_id;

/* @name SearchFriends */
SELECT
    c.external_id,
    c.display_name,
    c.photo_thumbnail_url
FROM friends.friends c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND c.display_name ILIKE :searchPattern
  AND (:excludeFriendExternalId::uuid IS NULL OR c.external_id != :excludeFriendExternalId)
ORDER BY c.display_name ASC
LIMIT :limit;
