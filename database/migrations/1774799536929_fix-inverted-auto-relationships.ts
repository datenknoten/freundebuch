import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Fix auto-created relationships that had their type incorrectly inverted.
 *
 * Bug: when adding a member with 'existing_member' direction rules (e.g., adding
 * a child to a family with an existing parent), the code used the inverse
 * relationship type instead of the rule's type. For example, the rule
 * ('child', 'parent', 'parent', 'existing_member') should create
 * parent --[parent]--> child, but instead created parent --[child]--> child.
 *
 * This migration identifies affected relationships by:
 * 1. Having source_membership_id set (auto-created)
 * 2. The source membership's contact being the "to" friend (existing_member direction)
 * 3. The relationship type being an asymmetric type (inverse != self)
 *
 * It then swaps the type back to its inverse (which is the correct original type).
 *
 * If a user already manually created the correct relationship, the buggy one is
 * deleted instead of updated (to avoid unique constraint violations).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // First, delete buggy relationships where the correct one already exists
  // (user manually added it, so we just need to clean up the duplicate with wrong type)
  pgm.sql(`
    DELETE FROM friends.friend_relationships fr
    USING
      collectives.collective_memberships cm,
      friends.relationship_types rt
    WHERE fr.source_membership_id IS NOT NULL
      AND cm.id = fr.source_membership_id
      AND cm.contact_id = fr.related_friend_id
      AND rt.id = fr.relationship_type_id
      AND rt.inverse_type_id IS NOT NULL
      AND rt.inverse_type_id != rt.id
      AND EXISTS (
        SELECT 1 FROM friends.friend_relationships correct
        WHERE correct.friend_id = fr.friend_id
          AND correct.related_friend_id = fr.related_friend_id
          AND correct.relationship_type_id = rt.inverse_type_id
      );
  `);

  // Then, fix remaining buggy relationships by swapping to the correct type
  pgm.sql(`
    UPDATE friends.friend_relationships fr
    SET relationship_type_id = rt.inverse_type_id
    FROM
      collectives.collective_memberships cm,
      friends.relationship_types rt
    WHERE fr.source_membership_id IS NOT NULL
      AND cm.id = fr.source_membership_id
      AND cm.contact_id = fr.related_friend_id
      AND rt.id = fr.relationship_type_id
      AND rt.inverse_type_id IS NOT NULL
      AND rt.inverse_type_id != rt.id;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Reverse: invert the types back (applying the same bug again)
  // This is a best-effort rollback — deleted duplicates cannot be restored
  pgm.sql(`
    UPDATE friends.friend_relationships fr
    SET relationship_type_id = rt.inverse_type_id
    FROM
      collectives.collective_memberships cm,
      friends.relationship_types rt
    WHERE fr.source_membership_id IS NOT NULL
      AND cm.id = fr.source_membership_id
      AND cm.contact_id = fr.related_friend_id
      AND rt.id = fr.relationship_type_id
      AND rt.inverse_type_id IS NOT NULL
      AND rt.inverse_type_id != rt.id;
  `);
}
