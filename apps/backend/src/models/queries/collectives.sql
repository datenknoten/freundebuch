/* @name GetCollectiveTypes */
-- Get all collective types available to a user (system defaults + user's custom)
SELECT
    ct.external_id,
    ct.name,
    ct.description,
    ct.is_system_default,
    ct.created_at,
    ct.updated_at
FROM collectives.collective_types ct
WHERE ct.is_system_default = TRUE
   OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)
ORDER BY ct.is_system_default DESC, ct.name ASC;

/* @name GetCollectiveTypeById */
SELECT
    ct.external_id,
    ct.name,
    ct.description,
    ct.is_system_default,
    ct.created_at,
    ct.updated_at
FROM collectives.collective_types ct
WHERE ct.external_id = :typeExternalId::uuid
  AND (
    ct.is_system_default = TRUE
    OR ct.user_id = (SELECT id FROM auth.users WHERE external_id = :userExternalId::uuid)
  );

/* @name GetRolesForType */
SELECT
    cr.external_id,
    cr.role_key,
    cr.label,
    cr.sort_order
FROM collectives.collective_roles cr
INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
WHERE ct.external_id = :typeExternalId::uuid
ORDER BY cr.sort_order ASC, cr.label ASC;

/* @name GetRulesForType */
SELECT
    nr.external_id AS new_member_role_id,
    nr.role_key AS new_member_role_key,
    er.external_id AS existing_member_role_id,
    er.role_key AS existing_member_role_key,
    crr.relationship_type_id,
    crr.relationship_direction
FROM collectives.collective_relationship_rules crr
INNER JOIN collectives.collective_types ct ON crr.collective_type_id = ct.id
INNER JOIN collectives.collective_roles nr ON crr.new_member_role_id = nr.id
INNER JOIN collectives.collective_roles er ON crr.existing_member_role_id = er.id
WHERE ct.external_id = :typeExternalId::uuid;

/* @name GetCollectivesByUserId */
SELECT
    c.external_id,
    c.name,
    ct.external_id AS type_external_id,
    ct.name AS type_name,
    c.photo_url,
    c.photo_thumbnail_url,
    c.created_at,
    c.deleted_at,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
LEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id
WHERE u.external_id = :userExternalId::uuid
  AND (
    :includeDeleted::boolean = TRUE
    OR c.deleted_at IS NULL
  )
  AND (
    :typeExternalId::uuid IS NULL
    OR ct.external_id = :typeExternalId::uuid
  )
  AND (
    :search::text IS NULL
    OR c.name ILIKE '%' || :search || '%'
    OR c.notes ILIKE '%' || :search || '%'
  )
GROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, c.photo_url, c.photo_thumbnail_url, c.created_at, c.deleted_at
ORDER BY c.name ASC, c.created_at DESC
LIMIT :pageSize
OFFSET :offset;

/* @name CountCollectivesByUserId */
SELECT COUNT(DISTINCT c.id)::int AS total_count
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
WHERE u.external_id = :userExternalId::uuid
  AND (
    :includeDeleted::boolean = TRUE
    OR c.deleted_at IS NULL
  )
  AND (
    :typeExternalId::uuid IS NULL
    OR ct.external_id = :typeExternalId::uuid
  )
  AND (
    :search::text IS NULL
    OR c.name ILIKE '%' || :search || '%'
    OR c.notes ILIKE '%' || :search || '%'
  );

/* @name GetCollectiveById */
SELECT
    c.external_id,
    c.name,
    ct.external_id AS type_external_id,
    ct.name AS type_name,
    ct.description AS type_description,
    ct.is_system_default AS type_is_system_default,
    c.photo_url,
    c.photo_thumbnail_url,
    c.notes,
    c.address_street_line1,
    c.address_street_line2,
    c.address_city,
    c.address_state_province,
    c.address_postal_code,
    c.address_country,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.id IS NOT NULL)::int AS member_count,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.is_active = TRUE)::int AS active_member_count
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
LEFT JOIN collectives.collective_memberships cm ON cm.collective_id = c.id
WHERE c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
GROUP BY c.id, c.external_id, c.name, ct.external_id, ct.name, ct.description, ct.is_system_default,
         c.photo_url, c.photo_thumbnail_url, c.notes,
         c.address_street_line1, c.address_street_line2, c.address_city,
         c.address_state_province, c.address_postal_code, c.address_country,
         c.created_at, c.updated_at, c.deleted_at;

/* @name GetMemberPreview */
-- Gets first N members for list preview
SELECT
    f.external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url
FROM friends.friends f
INNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
WHERE c.external_id = :collectiveExternalId::uuid
  AND cm.is_active = TRUE
  AND f.deleted_at IS NULL
ORDER BY display_name ASC
LIMIT :limit;

/* @name GetMemberPreviewBatch */
-- Gets first N members for each collective in a batch (avoids N+1)
SELECT
    c.external_id AS collective_external_id,
    sub.external_id,
    sub.display_name,
    sub.photo_url
FROM collectives.collectives c
CROSS JOIN LATERAL (
    SELECT
        f.external_id,
        COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
        f.photo_url
    FROM friends.friends f
    INNER JOIN collectives.collective_memberships cm ON cm.contact_id = f.id
    WHERE cm.collective_id = c.id
      AND cm.is_active = TRUE
      AND f.deleted_at IS NULL
    ORDER BY display_name ASC
    LIMIT :limit
) sub
WHERE c.external_id = ANY(:collectiveExternalIds::uuid[]);

/* @name GetMembersByCollectiveId */
SELECT
    cm.external_id AS membership_external_id,
    f.external_id AS contact_external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url,
    cr.external_id AS role_external_id,
    cr.role_key,
    cr.label AS role_label,
    cr.sort_order AS role_sort_order,
    cm.is_active,
    cm.inactive_reason,
    cm.inactive_date,
    cm.joined_date,
    cm.notes,
    cm.created_at,
    cm.updated_at
FROM collectives.collective_memberships cm
INNER JOIN friends.friends f ON cm.contact_id = f.id
INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL
  AND (
    :includeInactive::boolean = TRUE
    OR cm.is_active = TRUE
  )
ORDER BY cm.is_active DESC, cr.sort_order ASC, display_name ASC;

/* @name CreateCollective */
INSERT INTO collectives.collectives (
    user_id,
    collective_type_id,
    name,
    photo_url,
    photo_thumbnail_url,
    notes,
    address_street_line1,
    address_street_line2,
    address_city,
    address_state_province,
    address_postal_code,
    address_country
)
SELECT
    u.id,
    ct.id,
    :name,
    :photoUrl,
    :photoThumbnailUrl,
    :notes,
    :addressStreetLine1,
    :addressStreetLine2,
    :addressCity,
    :addressStateProvince,
    :addressPostalCode,
    :addressCountry
FROM auth.users u
INNER JOIN collectives.collective_types ct ON ct.external_id = :typeExternalId::uuid
WHERE u.external_id = :userExternalId::uuid
  AND (ct.is_system_default = TRUE OR ct.user_id = u.id)
RETURNING
    external_id,
    name,
    photo_url,
    photo_thumbnail_url,
    notes,
    address_street_line1,
    address_street_line2,
    address_city,
    address_state_province,
    address_postal_code,
    address_country,
    created_at,
    updated_at;

/* @name UpdateCollective */
UPDATE collectives.collectives c
SET
    name = COALESCE(:name, c.name),
    photo_url = CASE
        WHEN :updatePhotoUrl::boolean = true THEN :photoUrl
        ELSE c.photo_url
    END,
    photo_thumbnail_url = CASE
        WHEN :updatePhotoThumbnailUrl::boolean = true THEN :photoThumbnailUrl
        ELSE c.photo_thumbnail_url
    END,
    notes = CASE
        WHEN :updateNotes::boolean = true THEN :notes
        ELSE c.notes
    END,
    address_street_line1 = CASE
        WHEN :updateAddress::boolean = true THEN :addressStreetLine1
        ELSE c.address_street_line1
    END,
    address_street_line2 = CASE
        WHEN :updateAddress::boolean = true THEN :addressStreetLine2
        ELSE c.address_street_line2
    END,
    address_city = CASE
        WHEN :updateAddress::boolean = true THEN :addressCity
        ELSE c.address_city
    END,
    address_state_province = CASE
        WHEN :updateAddress::boolean = true THEN :addressStateProvince
        ELSE c.address_state_province
    END,
    address_postal_code = CASE
        WHEN :updateAddress::boolean = true THEN :addressPostalCode
        ELSE c.address_postal_code
    END,
    address_country = CASE
        WHEN :updateAddress::boolean = true THEN :addressCountry
        ELSE c.address_country
    END,
    updated_at = current_timestamp
FROM auth.users u
WHERE c.external_id = :collectiveExternalId::uuid
  AND c.user_id = u.id
  AND u.external_id = :userExternalId::uuid
  AND c.deleted_at IS NULL
RETURNING
    c.external_id,
    c.name,
    c.photo_url,
    c.photo_thumbnail_url,
    c.notes,
    c.address_street_line1,
    c.address_street_line2,
    c.address_city,
    c.address_state_province,
    c.address_postal_code,
    c.address_country,
    c.created_at,
    c.updated_at;

/* @name DeleteCollective */
-- Soft delete collective
UPDATE collectives.collectives c
SET deleted_at = current_timestamp
FROM auth.users u
WHERE c.external_id = :collectiveExternalId::uuid
  AND c.user_id = u.id
  AND u.external_id = :userExternalId::uuid
  AND c.deleted_at IS NULL
RETURNING c.external_id;

/* @name GetCollectiveInternalId */
-- Helper to get internal ID for a collective
SELECT c.id
FROM collectives.collectives c
INNER JOIN auth.users u ON c.user_id = u.id
WHERE c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid;

/* @name GetRoleInternalId */
-- Helper to get internal ID for a role
SELECT cr.id
FROM collectives.collective_roles cr
INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
INNER JOIN collectives.collectives c ON c.collective_type_id = ct.id
WHERE cr.external_id = :roleExternalId::uuid
  AND c.external_id = :collectiveExternalId::uuid;

/* @name GetRoleByExternalId */
-- Gets full role info by external ID within a collective
SELECT
    cr.external_id,
    cr.role_key,
    cr.label,
    cr.sort_order
FROM collectives.collective_roles cr
INNER JOIN collectives.collective_types ct ON cr.collective_type_id = ct.id
INNER JOIN collectives.collectives c ON c.collective_type_id = ct.id
WHERE cr.external_id = :roleExternalId::uuid
  AND c.external_id = :collectiveExternalId::uuid;

/* @name GetContactInternalId */
-- Helper to get internal ID for a contact
SELECT f.id
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.external_id = :contactExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL;

/* @name AddMembership */
INSERT INTO collectives.collective_memberships (
    collective_id,
    contact_id,
    role_id,
    joined_date,
    notes
)
VALUES (
    :collectiveId,
    :contactId,
    :roleId,
    :joinedDate::date,
    :notes
)
RETURNING
    id,
    external_id,
    collective_id,
    contact_id,
    role_id,
    is_active,
    joined_date,
    notes,
    created_at,
    updated_at;

/* @name GetMembershipById */
SELECT
    cm.id,
    cm.external_id AS membership_external_id,
    f.external_id AS contact_external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url,
    cr.external_id AS role_external_id,
    cr.role_key,
    cr.label AS role_label,
    cr.sort_order AS role_sort_order,
    cm.is_active,
    cm.inactive_reason,
    cm.inactive_date,
    cm.joined_date,
    cm.notes,
    cm.created_at,
    cm.updated_at
FROM collectives.collective_memberships cm
INNER JOIN friends.friends f ON cm.contact_id = f.id
INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE cm.external_id = :membershipExternalId::uuid
  AND c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL;

/* @name UpdateMembershipRole */
UPDATE collectives.collective_memberships cm
SET
    role_id = :roleId,
    updated_at = current_timestamp
FROM collectives.collectives c, auth.users u
WHERE cm.external_id = :membershipExternalId::uuid
  AND cm.collective_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND cm.is_active = TRUE
RETURNING cm.external_id, cm.role_id;

/* @name DeactivateMembership */
UPDATE collectives.collective_memberships cm
SET
    is_active = FALSE,
    inactive_reason = :inactiveReason,
    inactive_date = :inactiveDate::date,
    updated_at = current_timestamp
FROM collectives.collectives c, auth.users u
WHERE cm.external_id = :membershipExternalId::uuid
  AND cm.collective_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND cm.is_active = TRUE
RETURNING cm.external_id, cm.id;

/* @name ReactivateMembership */
UPDATE collectives.collective_memberships cm
SET
    is_active = TRUE,
    inactive_reason = NULL,
    inactive_date = NULL,
    updated_at = current_timestamp
FROM collectives.collectives c, auth.users u
WHERE cm.external_id = :membershipExternalId::uuid
  AND cm.collective_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND cm.is_active = FALSE
RETURNING cm.external_id;

/* @name RemoveMembership */
-- Note: This actually deletes the membership (use DeactivateMembership for soft delete)
DELETE FROM collectives.collective_memberships cm
USING collectives.collectives c, auth.users u
WHERE cm.external_id = :membershipExternalId::uuid
  AND cm.collective_id = c.id
  AND c.user_id = u.id
  AND c.external_id = :collectiveExternalId::uuid
  AND u.external_id = :userExternalId::uuid
RETURNING cm.id, cm.external_id;

/* @name GetOtherActiveMembers */
-- Get other active members of a collective (excluding a specific contact)
SELECT
    cm.id AS membership_id,
    cm.external_id AS membership_external_id,
    f.id AS contact_id,
    f.external_id AS contact_external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url,
    cr.id AS role_id,
    cr.external_id AS role_external_id,
    cr.role_key
FROM collectives.collective_memberships cm
INNER JOIN friends.friends f ON cm.contact_id = f.id
INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
WHERE c.id = :collectiveId
  AND cm.is_active = TRUE
  AND f.deleted_at IS NULL
  AND f.id != :excludeContactId;

/* @name GetRulesForTypeInternal */
-- Get rules by internal type ID for auto-relationship creation
SELECT
    crr.new_member_role_id,
    crr.existing_member_role_id,
    crr.relationship_type_id,
    crr.relationship_direction
FROM collectives.collective_relationship_rules crr
WHERE crr.collective_type_id = :collectiveTypeId;

/* @name GetCollectiveTypeIdForCollective */
SELECT c.collective_type_id
FROM collectives.collectives c
WHERE c.id = :collectiveId;

/* @name CreateRelationshipWithSource */
-- Create a relationship with source_membership_id set.
-- On conflict, update the source to track the latest membership that triggered creation.
INSERT INTO friends.friend_relationships (
    friend_id,
    related_friend_id,
    relationship_type_id,
    source_membership_id
)
VALUES (
    :fromFriendId,
    :toFriendId,
    :relationshipTypeId,
    :sourceMembershipId
)
ON CONFLICT (friend_id, related_friend_id, relationship_type_id)
DO UPDATE SET source_membership_id = EXCLUDED.source_membership_id
RETURNING external_id, id;

/* @name CheckRelationshipExists */
-- Check if a relationship already exists between two friends
SELECT COUNT(*)::int AS count
FROM friends.friend_relationships
WHERE friend_id = :fromFriendId
  AND related_friend_id = :toFriendId
  AND relationship_type_id = :relationshipTypeId;

/* @name DeleteRelationshipsByMembershipId */
-- Delete all relationships created by a specific membership
DELETE FROM friends.friend_relationships
WHERE source_membership_id = :membershipId
RETURNING external_id;

/* @name GetRelationshipTypeInfo */
-- Get relationship type info for preview
SELECT
    rt.id,
    rt.label,
    rt.category,
    rt.inverse_type_id
FROM friends.relationship_types rt
WHERE rt.id = :relationshipTypeId;

/* @name GetContactInfo */
-- Get basic contact info for preview
SELECT
    f.id,
    f.external_id,
    COALESCE(f.display_name, f.nickname, 'Unknown') AS display_name,
    f.photo_url
FROM friends.friends f
INNER JOIN auth.users u ON f.user_id = u.id
WHERE f.external_id = :contactExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND f.deleted_at IS NULL;

/* @name GetCollectivesForContact */
-- Get collectives a contact belongs to
SELECT
    c.external_id AS collective_external_id,
    c.name AS collective_name,
    ct.name AS type_name,
    cr.external_id AS role_external_id,
    cr.role_key,
    cr.label AS role_label,
    cr.sort_order AS role_sort_order,
    cm.external_id AS membership_external_id,
    cm.is_active
FROM collectives.collective_memberships cm
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
INNER JOIN collectives.collective_types ct ON c.collective_type_id = ct.id
INNER JOIN collectives.collective_roles cr ON cm.role_id = cr.id
INNER JOIN friends.friends f ON cm.contact_id = f.id
INNER JOIN auth.users u ON c.user_id = u.id
WHERE f.external_id = :contactExternalId::uuid
  AND u.external_id = :userExternalId::uuid
  AND c.deleted_at IS NULL
ORDER BY c.name ASC;

/* @name CheckDuplicateActiveMembership */
-- Check if a contact already has an active membership in the collective
SELECT COUNT(*)::int AS count
FROM collectives.collective_memberships cm
INNER JOIN collectives.collectives c ON cm.collective_id = c.id
INNER JOIN friends.friends f ON cm.contact_id = f.id
WHERE c.external_id = :collectiveExternalId::uuid
  AND f.external_id = :contactExternalId::uuid
  AND cm.is_active = TRUE;
