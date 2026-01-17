import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Migration: Convert professional information to employment history subresource
 *
 * This migration:
 * 1. Creates the `friend_professional_history` table to store employment history
 * 2. Migrates existing professional data (job_title, organization, department, work_notes)
 *    from the friends table to the new table as the current position
 * 3. Removes the old professional columns from the friends table
 * 4. Updates the full-text search trigger to use the new table
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // 1. Create the friend_professional_history table
  // ============================================================================
  pgm.createTable(
    { schema: 'friends', name: 'friend_professional_history' },
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
      friend_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'CASCADE',
        comment: 'Reference to the parent friend',
      },
      job_title: {
        type: 'text',
        comment: 'Job title/position',
      },
      organization: {
        type: 'text',
        comment: 'Company or organization name',
      },
      department: {
        type: 'text',
        comment: 'Department within the organization',
      },
      notes: {
        type: 'text',
        comment: 'Additional notes about this position',
      },
      from_month: {
        type: 'smallint',
        notNull: true,
        comment: 'Start month (1-12)',
      },
      from_year: {
        type: 'smallint',
        notNull: true,
        comment: 'Start year',
      },
      to_month: {
        type: 'smallint',
        comment: 'End month (1-12), NULL for current position',
      },
      to_year: {
        type: 'smallint',
        comment: 'End year, NULL for current position',
      },
      is_primary: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'Whether this is the primary employment (shown in CardDAV)',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
        comment: 'When this record was created',
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE friends.friend_professional_history IS 'Employment history for friends with date ranges'`,
  );

  // ============================================================================
  // 2. Add constraints
  // ============================================================================

  // from_month must be between 1 and 12
  pgm.addConstraint(
    { schema: 'friends', name: 'friend_professional_history' },
    'valid_from_month',
    { check: 'from_month BETWEEN 1 AND 12' },
  );

  // to_month must be between 1 and 12 (when set)
  pgm.addConstraint({ schema: 'friends', name: 'friend_professional_history' }, 'valid_to_month', {
    check: 'to_month IS NULL OR to_month BETWEEN 1 AND 12',
  });

  // to_month and to_year must both be NULL (current) or both be set
  pgm.addConstraint(
    { schema: 'friends', name: 'friend_professional_history' },
    'to_date_consistency',
    {
      check:
        '(to_month IS NULL AND to_year IS NULL) OR (to_month IS NOT NULL AND to_year IS NOT NULL)',
    },
  );

  // When both dates set, end date must be >= start date
  pgm.addConstraint(
    { schema: 'friends', name: 'friend_professional_history' },
    'valid_date_range',
    {
      check:
        'to_year IS NULL OR (to_year > from_year) OR (to_year = from_year AND to_month >= from_month)',
    },
  );

  // ============================================================================
  // 3. Create indexes
  // ============================================================================

  pgm.createIndex({ schema: 'friends', name: 'friend_professional_history' }, 'external_id', {
    name: 'idx_friend_professional_history_external_id',
  });

  pgm.createIndex({ schema: 'friends', name: 'friend_professional_history' }, 'friend_id', {
    name: 'idx_friend_professional_history_friend_id',
  });

  pgm.createIndex(
    { schema: 'friends', name: 'friend_professional_history' },
    ['friend_id', 'is_primary'],
    { name: 'idx_friend_professional_history_primary' },
  );

  // ============================================================================
  // 4. Migrate existing data from friends table
  // ============================================================================

  pgm.sql(`
    INSERT INTO friends.friend_professional_history (
      friend_id,
      job_title,
      organization,
      department,
      notes,
      from_month,
      from_year,
      to_month,
      to_year,
      is_primary
    )
    SELECT
      id,
      job_title,
      organization,
      department,
      work_notes,
      EXTRACT(MONTH FROM CURRENT_DATE)::smallint,
      EXTRACT(YEAR FROM CURRENT_DATE)::smallint,
      NULL,
      NULL,
      true
    FROM friends.friends
    WHERE job_title IS NOT NULL
       OR organization IS NOT NULL
       OR department IS NOT NULL
       OR work_notes IS NOT NULL
  `);

  // ============================================================================
  // 5. Update the full-text search trigger to use the new table
  // ============================================================================

  // Drop the existing trigger (it references the old columns)
  pgm.sql(`DROP TRIGGER IF EXISTS friends_search_vector_update ON friends.friends;`);

  // Recreate the trigger function to use the professional_history table
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.update_friend_search_vector()
    RETURNS TRIGGER AS $$
    DECLARE
      primary_job_title TEXT;
      primary_organization TEXT;
      primary_department TEXT;
      primary_notes TEXT;
    BEGIN
      -- Get primary professional info from the new table
      SELECT
        ph.job_title,
        ph.organization,
        ph.department,
        ph.notes
      INTO
        primary_job_title,
        primary_organization,
        primary_department,
        primary_notes
      FROM friends.friend_professional_history ph
      WHERE ph.friend_id = NEW.id AND ph.is_primary = true
      LIMIT 1;

      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.nickname, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_first, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_last, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_middle, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(primary_organization, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(primary_job_title, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(primary_department, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(primary_notes, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.interests, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(
    `COMMENT ON FUNCTION friends.update_friend_search_vector() IS 'Trigger function to update search_vector on friend insert/update, using primary professional history'`,
  );

  // Recreate the trigger
  pgm.sql(`
    CREATE TRIGGER friends_search_vector_update
    BEFORE INSERT OR UPDATE ON friends.friends
    FOR EACH ROW EXECUTE FUNCTION friends.update_friend_search_vector();
  `);

  // Create a trigger to update friend's search_vector when professional history changes
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.refresh_friend_search_on_professional_history_change()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Touch the parent friend to trigger search vector update
      IF TG_OP = 'DELETE' THEN
        UPDATE friends.friends SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.friend_id;
        RETURN OLD;
      ELSE
        UPDATE friends.friends SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.friend_id;
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER professional_history_search_refresh
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_professional_history
    FOR EACH ROW EXECUTE FUNCTION friends.refresh_friend_search_on_professional_history_change();
  `);

  // ============================================================================
  // 6. Update the CardDAV change tracking trigger to not reference removed columns
  // ============================================================================

  // Update log_friend_change() to remove references to job_title, organization, department, work_notes
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_friend_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_change_type TEXT;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is a meaningful change (excluding removed professional columns)
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.nickname IS DISTINCT FROM NEW.nickname
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.interests IS DISTINCT FROM NEW.interests
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

  // Add trigger to log professional history changes for CardDAV sync
  pgm.sql(`
    CREATE TRIGGER professional_history_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_professional_history
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);

  // ============================================================================
  // 7. Remove old columns from friends table
  // ============================================================================

  pgm.dropColumn({ schema: 'friends', name: 'friends' }, 'job_title');
  pgm.dropColumn({ schema: 'friends', name: 'friends' }, 'organization');
  pgm.dropColumn({ schema: 'friends', name: 'friends' }, 'department');
  pgm.dropColumn({ schema: 'friends', name: 'friends' }, 'work_notes');

  // ============================================================================
  // 7. Refresh search vectors for all friends (to pick up migrated data)
  // ============================================================================

  pgm.sql(`UPDATE friends.friends SET updated_at = updated_at;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // 1. Re-add the old columns to friends table
  // ============================================================================

  pgm.addColumn(
    { schema: 'friends', name: 'friends' },
    {
      job_title: { type: 'text', comment: 'Job title/position' },
      organization: { type: 'text', comment: 'Company or organization name' },
      department: { type: 'text', comment: 'Department within the organization' },
      work_notes: { type: 'text', comment: 'Additional work-related notes' },
    },
  );

  // ============================================================================
  // 2. Migrate data back from professional_history to friends table (primary only)
  // ============================================================================

  pgm.sql(`
    UPDATE friends.friends f
    SET
      job_title = ph.job_title,
      organization = ph.organization,
      department = ph.department,
      work_notes = ph.notes
    FROM friends.friend_professional_history ph
    WHERE ph.friend_id = f.id AND ph.is_primary = true
  `);

  // ============================================================================
  // 3. Drop triggers and functions related to professional history
  // ============================================================================

  pgm.sql(
    `DROP TRIGGER IF EXISTS professional_history_search_refresh ON friends.friend_professional_history;`,
  );
  pgm.sql(
    `DROP TRIGGER IF EXISTS professional_history_change_trigger ON friends.friend_professional_history;`,
  );
  pgm.sql(
    `DROP FUNCTION IF EXISTS friends.refresh_friend_search_on_professional_history_change();`,
  );

  // ============================================================================
  // 4. Restore the original log_friend_change function with old columns
  // ============================================================================

  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.log_friend_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_change_type TEXT;
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

  // ============================================================================
  // 5. Drop the professional history table (before restoring search trigger)
  // ============================================================================

  pgm.dropTable({ schema: 'friends', name: 'friend_professional_history' }, { cascade: true });

  // ============================================================================
  // 6. Restore the original search trigger function
  // ============================================================================

  pgm.sql(`DROP TRIGGER IF EXISTS friends_search_vector_update ON friends.friends;`);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.update_friend_search_vector()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.nickname, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_first, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_last, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_middle, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.job_title, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.department, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.work_notes, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.interests, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER friends_search_vector_update
    BEFORE INSERT OR UPDATE ON friends.friends
    FOR EACH ROW EXECUTE FUNCTION friends.update_friend_search_vector();
  `);

  // ============================================================================
  // 7. Refresh search vectors
  // ============================================================================

  pgm.sql(`UPDATE friends.friends SET updated_at = updated_at;`);
}
