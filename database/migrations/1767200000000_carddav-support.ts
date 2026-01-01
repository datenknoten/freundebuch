import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================
  // App-Specific Passwords for CardDAV/CalDAV
  // ============================================

  pgm.createTable(
    { schema: 'auth', name: 'app_passwords' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID (never expose in API)',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
      },
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
      },
      name: {
        type: 'varchar(100)',
        notNull: true,
        comment: 'User-friendly name (e.g., "My iPhone")',
      },
      password_hash: {
        type: 'varchar(255)',
        notNull: true,
        comment: 'bcrypt hash of the app password',
      },
      password_prefix: {
        type: 'varchar(8)',
        notNull: true,
        comment: 'First 8 chars for quick lookup',
      },
      last_used_at: {
        type: 'timestamptz',
        comment: 'Last time this password was used for authentication',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      revoked_at: {
        type: 'timestamptz',
        comment: 'When revoked; NULL means active',
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE auth.app_passwords IS 'App-specific passwords for CardDAV/CalDAV authentication'`,
  );

  // Add constraint for non-empty name
  pgm.addConstraint({ schema: 'auth', name: 'app_passwords' }, 'app_passwords_name_not_empty', {
    check: 'LENGTH(TRIM(name)) > 0',
  });

  // Indexes for app_passwords
  pgm.createIndex({ schema: 'auth', name: 'app_passwords' }, 'external_id', {
    name: 'idx_app_passwords_external_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'app_passwords' }, 'user_id', {
    name: 'idx_app_passwords_user_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'app_passwords' }, 'password_prefix', {
    name: 'idx_app_passwords_prefix',
  });
  pgm.createIndex({ schema: 'auth', name: 'app_passwords' }, 'user_id', {
    name: 'idx_app_passwords_active',
    where: 'revoked_at IS NULL',
  });

  // ============================================
  // Contact Change Tracking for CardDAV Sync
  // ============================================

  pgm.createTable(
    { schema: 'contacts', name: 'contact_changes' },
    {
      id: {
        type: 'bigserial',
        primaryKey: true,
        comment: 'Auto-incrementing ID used as sync token',
      },
      contact_id: {
        type: 'integer',
        comment: 'May be NULL for deleted contacts',
      },
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
      },
      contact_external_id: {
        type: 'uuid',
        notNull: true,
        comment: 'External ID of the contact (preserved even after deletion)',
      },
      change_type: {
        type: 'varchar(10)',
        notNull: true,
        comment: 'Type of change: create, update, delete',
      },
      changed_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.contact_changes IS 'Change log for CardDAV sync (sync-collection support)'`,
  );

  // Add constraint for valid change types
  pgm.addConstraint({ schema: 'contacts', name: 'contact_changes' }, 'valid_change_type', {
    check: "change_type IN ('create', 'update', 'delete')",
  });

  // Indexes for contact_changes
  pgm.createIndex({ schema: 'contacts', name: 'contact_changes' }, 'user_id', {
    name: 'idx_contact_changes_user_id',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_changes' }, ['user_id', 'id'], {
    name: 'idx_contact_changes_sync',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_changes' }, 'contact_external_id', {
    name: 'idx_contact_changes_contact_external_id',
  });

  // ============================================
  // Trigger Functions for Change Tracking
  // ============================================

  // Function to log contact changes
  pgm.sql(`
    CREATE OR REPLACE FUNCTION contacts.log_contact_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_change_type VARCHAR(10);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO contacts.contact_changes (contact_id, user_id, change_type, contact_external_id)
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

          INSERT INTO contacts.contact_changes (contact_id, user_id, change_type, contact_external_id)
          VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    COMMENT ON FUNCTION contacts.log_contact_change() IS 'Logs contact changes for CardDAV sync';
  `);

  // Function to log sub-resource changes (phones, emails, etc.)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION contacts.log_subresource_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_contact_external_id UUID;
      v_user_id INTEGER;
    BEGIN
      -- Get parent contact info
      SELECT external_id, user_id INTO v_contact_external_id, v_user_id
      FROM contacts.contacts
      WHERE id = COALESCE(NEW.contact_id, OLD.contact_id);

      IF v_contact_external_id IS NOT NULL THEN
        INSERT INTO contacts.contact_changes (contact_id, user_id, change_type, contact_external_id)
        VALUES (COALESCE(NEW.contact_id, OLD.contact_id), v_user_id, 'update', v_contact_external_id);
      END IF;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    COMMENT ON FUNCTION contacts.log_subresource_change() IS 'Logs sub-resource changes as contact updates for CardDAV sync';
  `);

  // ============================================
  // Create Triggers
  // ============================================

  // Trigger on contacts table
  pgm.sql(`
    CREATE TRIGGER contact_change_trigger
    AFTER INSERT OR UPDATE ON contacts.contacts
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_contact_change();
  `);

  // Triggers on sub-resource tables
  pgm.sql(`
    CREATE TRIGGER phone_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_phones
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER email_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_emails
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER address_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_addresses
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER url_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_urls
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER date_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_dates
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER social_profile_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_social_profiles
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);

  pgm.sql(`
    CREATE TRIGGER met_info_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts.contact_met_info
    FOR EACH ROW
    EXECUTE FUNCTION contacts.log_subresource_change();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers first
  pgm.sql('DROP TRIGGER IF EXISTS contact_change_trigger ON contacts.contacts;');
  pgm.sql('DROP TRIGGER IF EXISTS phone_change_trigger ON contacts.contact_phones;');
  pgm.sql('DROP TRIGGER IF EXISTS email_change_trigger ON contacts.contact_emails;');
  pgm.sql('DROP TRIGGER IF EXISTS address_change_trigger ON contacts.contact_addresses;');
  pgm.sql('DROP TRIGGER IF EXISTS url_change_trigger ON contacts.contact_urls;');
  pgm.sql('DROP TRIGGER IF EXISTS date_change_trigger ON contacts.contact_dates;');
  pgm.sql(
    'DROP TRIGGER IF EXISTS social_profile_change_trigger ON contacts.contact_social_profiles;',
  );
  pgm.sql('DROP TRIGGER IF EXISTS met_info_change_trigger ON contacts.contact_met_info;');

  // Drop trigger functions
  pgm.sql('DROP FUNCTION IF EXISTS contacts.log_contact_change() CASCADE;');
  pgm.sql('DROP FUNCTION IF EXISTS contacts.log_subresource_change() CASCADE;');

  // Drop tables
  pgm.dropTable({ schema: 'contacts', name: 'contact_changes' }, { cascade: true });
  pgm.dropTable({ schema: 'auth', name: 'app_passwords' }, { cascade: true });
}
