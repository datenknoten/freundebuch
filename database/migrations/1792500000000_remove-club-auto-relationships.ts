import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Stop the system-default Club type from auto-creating relationships.
 *
 * The Club type defined a rule that connected every new `member` to every
 * existing active `member` with a `friend` relationship (direction `both`).
 * For clubs this is wrong: sharing a club does not make two people friends.
 *
 * `up` first deletes the edges the rule already created, then the rule itself.
 *
 * Auto-created edges carry a `source_membership_id`. Manual edges have
 * `source_membership_id IS NULL`, because `CreateRelationshipWithSource` never
 * takes ownership of an existing edge (see
 * apps/backend/src/models/queries/collectives.sql, `@name
 * CreateRelationshipWithSource`). So `up` does not delete manual edges.
 *
 * Known consequence: an edge belongs to the membership that created it first.
 * If a Club membership created the same edge before a Friend Group membership
 * did, `up` deletes that edge too.
 *
 * The filter matches only the system-default Club type, so a user-defined type
 * named "Club" stays unchanged. It deliberately ignores soft-deleted
 * collectives and inactive memberships: their edges are auto-created Club
 * edges as well.
 *
 * `down` restores only the rule. It cannot restore the deleted relationships.
 */
export async function up(pgm: MigrationBuilder) {
  pgm.sql(`
    DELETE FROM friends.friend_relationships fr
    USING collectives.collective_memberships cm
    INNER JOIN collectives.collectives c ON c.id = cm.collective_id
    INNER JOIN collectives.collective_types ct ON ct.id = c.collective_type_id
    WHERE fr.source_membership_id = cm.id
      AND ct.user_id IS NULL
      AND ct.is_system_default = TRUE
      AND ct.name = 'Club';
  `);

  pgm.sql(`
    DELETE FROM collectives.collective_relationship_rules crr
    USING collectives.collective_types ct
    WHERE crr.collective_type_id = ct.id
      AND ct.user_id IS NULL
      AND ct.is_system_default = TRUE
      AND ct.name = 'Club';
  `);
}

export async function down(pgm: MigrationBuilder) {
  // Restores the Club rule only. The relationships that `up` deleted do not
  // come back: nothing records which edges existed before.
  pgm.sql(`
    INSERT INTO collectives.collective_relationship_rules (collective_type_id, new_member_role_id, existing_member_role_id, relationship_type_id, relationship_direction)
    SELECT
      ct.id,
      nr.id,
      er.id,
      'friend',
      'both'
    FROM collectives.collective_types ct
    JOIN collectives.collective_roles nr ON nr.collective_type_id = ct.id AND nr.role_key = 'member'
    JOIN collectives.collective_roles er ON er.collective_type_id = ct.id AND er.role_key = 'member'
    WHERE ct.user_id IS NULL
      AND ct.is_system_default = TRUE
      AND ct.name = 'Club'
    ON CONFLICT ON CONSTRAINT unique_rule DO NOTHING;
  `);
}
