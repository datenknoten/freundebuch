/* @name GetAllRelationshipTypes */
SELECT
    rt.id,
    rt.category,
    rt.label,
    rt.inverse_type_id
FROM contacts.relationship_types rt
ORDER BY rt.category ASC, rt.label ASC;

/* @name GetRelationshipsByContactId */
SELECT
    r.external_id,
    rc.external_id as related_contact_external_id,
    rc.display_name as related_contact_display_name,
    rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,
    r.relationship_type_id,
    rt.label as relationship_type_label,
    rt.category as relationship_category,
    r.notes,
    r.created_at
FROM contacts.contact_relationships r
INNER JOIN contacts.contacts c ON r.contact_id = c.id
INNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id
INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rc.deleted_at IS NULL
ORDER BY rt.category ASC, rt.label ASC, rc.display_name ASC;

/* @name GetRelationshipById */
SELECT
    r.external_id,
    rc.external_id as related_contact_external_id,
    rc.display_name as related_contact_display_name,
    rc.photo_thumbnail_url as related_contact_photo_thumbnail_url,
    r.relationship_type_id,
    rt.label as relationship_type_label,
    rt.category as relationship_category,
    r.notes,
    r.created_at
FROM contacts.contact_relationships r
INNER JOIN contacts.contacts c ON r.contact_id = c.id
INNER JOIN contacts.contacts rc ON r.related_contact_id = rc.id
INNER JOIN contacts.relationship_types rt ON r.relationship_type_id = rt.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE r.external_id = :relationshipExternalId
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rc.deleted_at IS NULL;

/* @name CreateRelationship */
INSERT INTO contacts.contact_relationships (
    contact_id,
    related_contact_id,
    relationship_type_id,
    notes
)
SELECT
    c.id,
    rc.id,
    :relationshipTypeId,
    :notes
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    external_id,
    contact_id,
    related_contact_id,
    relationship_type_id,
    notes,
    created_at;

/* @name CreateInverseRelationship */
INSERT INTO contacts.contact_relationships (
    contact_id,
    related_contact_id,
    relationship_type_id,
    notes
)
SELECT
    rc.id,
    c.id,
    rt.inverse_type_id,
    :notes
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN contacts.contacts rc ON rc.external_id = :relatedContactExternalId AND rc.user_id = u.id AND rc.deleted_at IS NULL
INNER JOIN contacts.relationship_types rt ON rt.id = :relationshipTypeId
WHERE c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND rt.inverse_type_id IS NOT NULL
RETURNING
    external_id,
    contact_id,
    related_contact_id,
    relationship_type_id,
    notes,
    created_at;

/* @name UpdateRelationship */
UPDATE contacts.contact_relationships r
SET
    notes = :notes
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE r.external_id = :relationshipExternalId
  AND r.contact_id = c.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING
    r.external_id,
    r.relationship_type_id,
    r.notes,
    r.created_at;

/* @name DeleteRelationship */
DELETE FROM contacts.contact_relationships r
USING contacts.contacts c, auth.users u
WHERE r.external_id = :relationshipExternalId
  AND r.contact_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :contactExternalId
  AND u.external_id = :userExternalId
  AND c.deleted_at IS NULL
RETURNING r.external_id, r.related_contact_id, r.relationship_type_id;

/* @name DeleteInverseRelationship */
DELETE FROM contacts.contact_relationships r
USING contacts.contacts c, contacts.relationship_types rt
WHERE r.contact_id = :relatedContactId
  AND r.related_contact_id = c.id
  AND r.relationship_type_id = rt.inverse_type_id
  AND rt.id = :relationshipTypeId
  AND c.id = (
    SELECT c2.id FROM contacts.contacts c2
    INNER JOIN auth.users u ON c2.user_id = u.id
    WHERE c2.external_id = :contactExternalId
      AND u.external_id = :userExternalId
      AND c2.deleted_at IS NULL
  )
RETURNING r.external_id;

/* @name SearchContacts */
SELECT
    c.external_id,
    c.display_name,
    c.photo_thumbnail_url
FROM contacts.contacts c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE u.external_id = :userExternalId
  AND c.deleted_at IS NULL
  AND c.display_name ILIKE :searchPattern
  AND (:excludeContactExternalId::uuid IS NULL OR c.external_id != :excludeContactExternalId)
ORDER BY c.display_name ASC
LIMIT :limit;
