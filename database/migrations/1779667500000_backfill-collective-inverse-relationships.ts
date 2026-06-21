import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Backfill missing reciprocal edges for auto-created collective relationships.
 *
 * Bug: when adding a member to a collective, the auto-relationship logic only
 * created a single directed edge (e.g. parent --[parent]--> child) and never
 * the inverse edge (child --[child]--> parent). Because a contact only sees
 * relationships where it is the "from" friend, the relationship showed up on
 * one contact but not the other (e.g. visible on the parent, missing on the
 * child).
 *
 * The service now creates both edges (mirroring the manual relationship flow),
 * but relationships created before that fix are still one-sided. This migration
 * inserts the missing inverse edge for every auto-created relationship
 * (identified by source_membership_id) whose type has an inverse.
 *
 * The reciprocal edge inherits the same source_membership_id so that removing
 * the membership continues to clean up both edges. ON CONFLICT DO NOTHING
 * preserves any edge the user may have created manually.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    INSERT INTO friends.friend_relationships (
      friend_id,
      related_friend_id,
      relationship_type_id,
      source_membership_id
    )
    SELECT
      fr.related_friend_id,
      fr.friend_id,
      rt.inverse_type_id,
      fr.source_membership_id
    FROM friends.friend_relationships fr
    INNER JOIN friends.relationship_types rt ON rt.id = fr.relationship_type_id
    WHERE fr.source_membership_id IS NOT NULL
      AND rt.inverse_type_id IS NOT NULL
    ON CONFLICT (friend_id, related_friend_id, relationship_type_id) DO NOTHING;
  `);
}

export async function down(): Promise<void> {
  // No-op: this is a best-effort data backfill. Backfilled inverse edges are
  // indistinguishable from legitimately auto-created edges (both carry a
  // source_membership_id), so we cannot safely remove them without risking the
  // deletion of valid relationships.
}
