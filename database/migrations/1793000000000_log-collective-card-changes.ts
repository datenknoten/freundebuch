import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Log collective changes to the CardDAV sync log.
 *
 * The CardDAV address book serves every non-deleted collective as a read-only
 * vCard group card (`KIND:group`, one `MEMBER` per active member whose own card
 * is visible). The group card's URI is `<collective external_id>.vcf`, so its
 * changes go into the existing `friends.friend_changes` table with
 * `friend_id = NULL` and `friend_external_id = collectives.external_id`:
 *
 * - One table has one sequence, so the sync token `sync-<MAX(id)>`, the change
 *   list, the retention sweep and the `friend_changes_pruned` watermark work
 *   unchanged for group cards.
 * - The change list only deals in `<external_id>.vcf` URIs; a separate log would
 *   need a shared sequence, a merge in token, change list and pruning, and a
 *   second watermark for the same result.
 *
 * Three triggers log a group card change:
 *
 * - `collectives.collectives`: create, rename, soft delete and restore.
 * - `collectives.collective_memberships`: members joining, leaving, or being
 *   (de)activated. Role, notes and dates are not on the card and are skipped.
 * - `friends.friends`: archiving, unarchiving, deleting or restoring a friend
 *   adds or removes its `MEMBER` entry in every collective it is active in.
 *
 * The membership trigger joins `auth.users`: account deletion cascades into
 * `collective_memberships` after the `auth.users` row is gone, and a log row
 * for that user would fail the `friend_changes.user_id` foreign key.
 */
export async function up(pgm: MigrationBuilder) {
  pgm.sql(`
    CREATE FUNCTION collectives.log_group_card_update(p_collective_id integer)
    RETURNS void AS $$
    BEGIN
      -- The JOIN on auth.users skips collectives whose owner is being deleted:
      -- account deletion cascades into collective_memberships after the
      -- auth.users row is gone, and a log row for it would fail the user_id FK.
      INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
      SELECT NULL, c.user_id, 'update', c.external_id
      FROM collectives.collectives c
      JOIN auth.users u ON u.id = c.user_id
      WHERE c.id = p_collective_id
        AND c.deleted_at IS NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE FUNCTION collectives.log_collective_card_change()
    RETURNS trigger AS $$
    DECLARE
      v_change_type text;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.deleted_at IS NULL THEN
          INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
          VALUES (NULL, NEW.user_id, 'create', NEW.external_id);
        END IF;
        RETURN NULL;
      END IF;

      IF OLD.name IS NOT DISTINCT FROM NEW.name
         AND OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN
        RETURN NULL;
      END IF;

      IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        v_change_type := 'delete';
      ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        v_change_type := 'create';
      ELSIF NEW.deleted_at IS NOT NULL THEN
        -- Renaming a deleted collective changes no visible card.
        RETURN NULL;
      ELSE
        v_change_type := 'update';
      END IF;

      INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
      VALUES (NULL, NEW.user_id, v_change_type, NEW.external_id);
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE FUNCTION collectives.log_membership_card_change()
    RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        PERFORM collectives.log_group_card_update(NEW.collective_id);
        RETURN NULL;
      END IF;

      IF TG_OP = 'DELETE' THEN
        PERFORM collectives.log_group_card_update(OLD.collective_id);
        RETURN NULL;
      END IF;

      -- Role, notes and dates are not on the group card.
      IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active
         AND OLD.contact_id IS NOT DISTINCT FROM NEW.contact_id
         AND OLD.collective_id IS NOT DISTINCT FROM NEW.collective_id THEN
        RETURN NULL;
      END IF;

      PERFORM collectives.log_group_card_update(NEW.collective_id);
      IF OLD.collective_id <> NEW.collective_id THEN
        PERFORM collectives.log_group_card_update(OLD.collective_id);
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE FUNCTION collectives.log_member_visibility_card_change()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
      SELECT NULL, c.user_id, 'update', c.external_id
      FROM collectives.collective_memberships m
      JOIN collectives.collectives c ON c.id = m.collective_id
      WHERE m.contact_id = NEW.id
        AND m.is_active
        AND c.deleted_at IS NULL;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER collective_card_change_trigger
      AFTER INSERT OR UPDATE ON collectives.collectives
      FOR EACH ROW EXECUTE FUNCTION collectives.log_collective_card_change();
    CREATE TRIGGER membership_card_change_trigger
      AFTER INSERT OR UPDATE OR DELETE ON collectives.collective_memberships
      FOR EACH ROW EXECUTE FUNCTION collectives.log_membership_card_change();
    CREATE TRIGGER member_visibility_card_change_trigger
      AFTER UPDATE OF archived_at, deleted_at ON friends.friends
      FOR EACH ROW
      WHEN (OLD.archived_at IS DISTINCT FROM NEW.archived_at OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
      EXECUTE FUNCTION collectives.log_member_visibility_card_change();
  `);

  pgm.sql(
    `COMMENT ON FUNCTION collectives.log_group_card_update(integer) IS 'Logs an update of a collective group card to friends.friend_changes unless the collective is deleted or its owner is being deleted'`,
  );
  pgm.sql(
    `COMMENT ON FUNCTION collectives.log_collective_card_change() IS 'Logs create, rename, soft delete and restore of a collective as a group card change in friends.friend_changes'`,
  );
  pgm.sql(
    `COMMENT ON FUNCTION collectives.log_membership_card_change() IS 'Logs a group card update when a membership is added, removed, (de)activated or moved'`,
  );
  pgm.sql(
    `COMMENT ON FUNCTION collectives.log_member_visibility_card_change() IS 'Logs a group card update for every collective a friend is active in when the friend is archived, unarchived, deleted or restored'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_id IS 'Friend id; NULL for deleted friends and for collective group cards'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_external_id IS 'External ID of the friend, or of the collective for a group card (preserved even after deletion)'`,
  );
}

/**
 * Collective rows in `friends.friend_changes` stay: the previous backend reports
 * unknown URIs as deleted, which is exactly what a client must do with its group
 * cards after the rollback. Deleting the rows could also lower `MAX(id)` and
 * with it the sync token.
 */
export async function down(pgm: MigrationBuilder) {
  pgm.sql('DROP TRIGGER IF EXISTS member_visibility_card_change_trigger ON friends.friends;');
  pgm.sql(
    'DROP TRIGGER IF EXISTS membership_card_change_trigger ON collectives.collective_memberships;',
  );
  pgm.sql('DROP TRIGGER IF EXISTS collective_card_change_trigger ON collectives.collectives;');
  pgm.sql('DROP FUNCTION IF EXISTS collectives.log_member_visibility_card_change();');
  pgm.sql('DROP FUNCTION IF EXISTS collectives.log_membership_card_change();');
  pgm.sql('DROP FUNCTION IF EXISTS collectives.log_collective_card_change();');
  pgm.sql('DROP FUNCTION IF EXISTS collectives.log_group_card_update(integer);');
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_id IS 'May be NULL for deleted friends'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_external_id IS 'External ID of the friend (preserved even after deletion)'`,
  );
}
