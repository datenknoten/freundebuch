import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Rename contact_changes to friend_changes and update column comments
 *
 * This migration completes the Contact → Friend rename by:
 * 1. Updating column comments that still reference "contact"
 * 2. Renaming the contact_changes table to friend_changes
 * 3. Renaming columns in friend_changes
 * 4. Updating trigger functions for CardDAV sync
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Update column comments that reference "contact"
  // ============================================================================
  pgm.sql(
    `COMMENT ON COLUMN friends.friends.nickname IS 'Informal name or nickname for the friend'`,
  );
  pgm.sql(`COMMENT ON COLUMN friends.friends.user_id IS 'Owner of this friend entry'`);
  pgm.sql(
    `COMMENT ON COLUMN friends.friends.search_vector IS 'Full-text search vector for friend fields'`,
  );
  pgm.sql(`COMMENT ON COLUMN friends.friend_relationships.friend_id IS 'The source friend'`);
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_relationships.related_friend_id IS 'The related friend'`,
  );

  // ============================================================================
  // Step 2: Drop existing triggers on contact_changes and sub-resource tables
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS contact_change_trigger ON friends.friends;');
  pgm.sql('DROP TRIGGER IF EXISTS phone_change_trigger ON friends.friend_phones;');
  pgm.sql('DROP TRIGGER IF EXISTS email_change_trigger ON friends.friend_emails;');
  pgm.sql('DROP TRIGGER IF EXISTS address_change_trigger ON friends.friend_addresses;');
  pgm.sql('DROP TRIGGER IF EXISTS url_change_trigger ON friends.friend_urls;');
  pgm.sql('DROP TRIGGER IF EXISTS date_change_trigger ON friends.friend_dates;');
  pgm.sql(
    'DROP TRIGGER IF EXISTS social_profile_change_trigger ON friends.friend_social_profiles;',
  );
  pgm.sql('DROP TRIGGER IF EXISTS met_info_change_trigger ON friends.friend_met_info;');

  // Drop old trigger functions
  pgm.sql('DROP FUNCTION IF EXISTS friends.log_contact_change() CASCADE;');
  pgm.sql('DROP FUNCTION IF EXISTS friends.log_subresource_change() CASCADE;');

  // ============================================================================
  // Step 3: Rename columns in contact_changes before renaming the table
  // ============================================================================
  pgm.renameColumn({ schema: 'friends', name: 'contact_changes' }, 'contact_id', 'friend_id');
  pgm.renameColumn(
    { schema: 'friends', name: 'contact_changes' },
    'contact_external_id',
    'friend_external_id',
  );

  // ============================================================================
  // Step 4: Rename the table
  // ============================================================================
  pgm.renameTable({ schema: 'friends', name: 'contact_changes' }, 'friend_changes');

  // ============================================================================
  // Step 5: Rename indexes for friend_changes
  // ============================================================================
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_changes_user_id RENAME TO idx_friend_changes_user_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_changes_sync RENAME TO idx_friend_changes_sync;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_changes_contact_external_id RENAME TO idx_friend_changes_friend_external_id;',
  );

  // ============================================================================
  // Step 6: Update table and column comments for friend_changes
  // ============================================================================
  pgm.sql(
    `COMMENT ON TABLE friends.friend_changes IS 'Change log for CardDAV sync (sync-collection support)'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_id IS 'May be NULL for deleted friends'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_changes.friend_external_id IS 'External ID of the friend (preserved even after deletion)'`,
  );

  // ============================================================================
  // Step 7: Recreate trigger functions with updated names and references
  // ============================================================================
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_friend_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_change_type VARCHAR(10);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is a meaningful change
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.nickname IS DISTINCT FROM NEW.nickname
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.job_title IS DISTINCT FROM NEW.job_title
           OR OLD.organization IS DISTINCT FROM NEW.organization
           OR OLD.department IS DISTINCT FROM NEW.department
           OR OLD.interests IS DISTINCT FROM NEW.interests
           OR OLD.work_notes IS DISTINCT FROM NEW.work_notes
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
        THEN
          -- Determine change type
          IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_change_type := 'delete';
          ELSE
            v_change_type := 'update';
          END IF;

          INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
          VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(
    `COMMENT ON FUNCTION friends.log_friend_change() IS 'Logs friend changes for CardDAV sync'`,
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_subresource_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_friend_external_id UUID;
      v_user_id INTEGER;
    BEGIN
      -- Get parent friend info
      SELECT external_id, user_id INTO v_friend_external_id, v_user_id
      FROM friends.friends
      WHERE id = COALESCE(NEW.friend_id, OLD.friend_id);

      IF v_friend_external_id IS NOT NULL THEN
        INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
        VALUES (COALESCE(NEW.friend_id, OLD.friend_id), v_user_id, 'update', v_friend_external_id);
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(
    `COMMENT ON FUNCTION friends.log_subresource_change() IS 'Logs sub-resource changes as friend updates for CardDAV sync'`,
  );

  // ============================================================================
  // Step 8: Recreate triggers with new function names
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER friend_change_trigger
    AFTER INSERT OR UPDATE ON friends.friends
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_friend_change();
  `);

  pgm.sql(`
    CREATE TRIGGER phone_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_phones
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER email_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_emails
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER address_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_addresses
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER url_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_urls
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER date_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_dates
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER social_profile_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_social_profiles
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER met_info_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_met_info
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Drop new triggers
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS friend_change_trigger ON friends.friends;');
  pgm.sql('DROP TRIGGER IF EXISTS phone_change_trigger ON friends.friend_phones;');
  pgm.sql('DROP TRIGGER IF EXISTS email_change_trigger ON friends.friend_emails;');
  pgm.sql('DROP TRIGGER IF EXISTS address_change_trigger ON friends.friend_addresses;');
  pgm.sql('DROP TRIGGER IF EXISTS url_change_trigger ON friends.friend_urls;');
  pgm.sql('DROP TRIGGER IF EXISTS date_change_trigger ON friends.friend_dates;');
  pgm.sql(
    'DROP TRIGGER IF EXISTS social_profile_change_trigger ON friends.friend_social_profiles;',
  );
  pgm.sql('DROP TRIGGER IF EXISTS met_info_change_trigger ON friends.friend_met_info;');

  // ============================================================================
  // Step 2: Drop new trigger functions
  // ============================================================================
  pgm.sql('DROP FUNCTION IF EXISTS friends.log_friend_change() CASCADE;');
  pgm.sql('DROP FUNCTION IF EXISTS friends.log_subresource_change() CASCADE;');

  // ============================================================================
  // Step 3: Rename friend_changes back to contact_changes
  // ============================================================================
  pgm.renameTable({ schema: 'friends', name: 'friend_changes' }, 'contact_changes');
  pgm.renameColumn({ schema: 'friends', name: 'contact_changes' }, 'friend_id', 'contact_id');
  pgm.renameColumn(
    { schema: 'friends', name: 'contact_changes' },
    'friend_external_id',
    'contact_external_id',
  );

  // ============================================================================
  // Step 4: Rename indexes back
  // ============================================================================
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_friend_changes_user_id RENAME TO idx_contact_changes_user_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_friend_changes_sync RENAME TO idx_contact_changes_sync;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_friend_changes_friend_external_id RENAME TO idx_contact_changes_contact_external_id;',
  );

  // ============================================================================
  // Step 5: Restore original table and column comments
  // ============================================================================
  pgm.sql(
    `COMMENT ON TABLE friends.contact_changes IS 'Change log for CardDAV sync (sync-collection support)'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.contact_changes.contact_id IS 'May be NULL for deleted contacts'`,
  );
  pgm.sql(
    `COMMENT ON COLUMN friends.contact_changes.contact_external_id IS 'External ID of the contact (preserved even after deletion)'`,
  );

  // Restore original column comments
  pgm.sql(
    `COMMENT ON COLUMN friends.friends.nickname IS 'Informal name or nickname for the contact'`,
  );
  pgm.sql(`COMMENT ON COLUMN friends.friends.user_id IS 'Owner of this contact'`);
  pgm.sql(
    `COMMENT ON COLUMN friends.friends.search_vector IS 'Full-text search vector for contact fields'`,
  );
  pgm.sql(`COMMENT ON COLUMN friends.friend_relationships.friend_id IS 'The source contact'`);
  pgm.sql(
    `COMMENT ON COLUMN friends.friend_relationships.related_friend_id IS 'The related contact'`,
  );

  // ============================================================================
  // Step 6: Recreate original trigger functions
  // ============================================================================
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_contact_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_change_type VARCHAR(10);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO friends.contact_changes (contact_id, user_id, change_type, contact_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is a meaningful change
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.nickname IS DISTINCT FROM NEW.nickname
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.job_title IS DISTINCT FROM NEW.job_title
           OR OLD.organization IS DISTINCT FROM NEW.organization
           OR OLD.department IS DISTINCT FROM NEW.department
           OR OLD.interests IS DISTINCT FROM NEW.interests
           OR OLD.work_notes IS DISTINCT FROM NEW.work_notes
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
        THEN
          -- Determine change type
          IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_change_type := 'delete';
          ELSE
            v_change_type := 'update';
          END IF;

          INSERT INTO friends.contact_changes (contact_id, user_id, change_type, contact_external_id)
          VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(
    `COMMENT ON FUNCTION friends.log_contact_change() IS 'Logs contact changes for CardDAV sync'`,
  );

  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_subresource_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_contact_external_id UUID;
      v_user_id INTEGER;
    BEGIN
      -- Get parent contact info
      SELECT external_id, user_id INTO v_contact_external_id, v_user_id
      FROM friends.friends
      WHERE id = COALESCE(NEW.friend_id, OLD.friend_id);

      IF v_contact_external_id IS NOT NULL THEN
        INSERT INTO friends.contact_changes (contact_id, user_id, change_type, contact_external_id)
        VALUES (COALESCE(NEW.friend_id, OLD.friend_id), v_user_id, 'update', v_contact_external_id);
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(
    `COMMENT ON FUNCTION friends.log_subresource_change() IS 'Logs sub-resource changes as contact updates for CardDAV sync'`,
  );

  // ============================================================================
  // Step 7: Recreate original triggers
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER contact_change_trigger
    AFTER INSERT OR UPDATE ON friends.friends
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_contact_change();
  `);

  pgm.sql(`
    CREATE TRIGGER phone_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_phones
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER email_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_emails
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER address_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_addresses
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER url_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_urls
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER date_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_dates
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER social_profile_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_social_profiles
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER met_info_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_met_info
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);
}
