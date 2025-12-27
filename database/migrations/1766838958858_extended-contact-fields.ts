import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 1B: Extended Contact Fields
 *
 * Adds:
 * - Professional information columns to contacts table
 * - contact_dates table for birthdays, anniversaries, custom dates
 * - contact_met_info table for how/where met information
 * - contact_social_profiles table for social media links
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Add professional fields to contacts table
  // ============================================================================
  pgm.addColumns(
    { schema: 'contacts', name: 'contacts' },
    {
      job_title: {
        type: 'text',
        comment: 'Job title / position',
      },
      organization: {
        type: 'text',
        comment: 'Company / organization name',
      },
      department: {
        type: 'text',
        comment: 'Department within organization',
      },
      work_notes: {
        type: 'text',
        comment: 'Notes about professional context',
      },
      interests: {
        type: 'text',
        comment: 'Interests and hobbies (free-form text)',
      },
    },
  );

  // ============================================================================
  // Create contact_dates table
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'contact_dates' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
      },
      contact_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'CASCADE',
      },
      date_value: {
        type: 'date',
        notNull: true,
        comment: 'The date value',
      },
      year_known: {
        type: 'boolean',
        notNull: true,
        default: true,
        comment: 'Whether the year is known (false = only month/day)',
      },
      date_type: {
        type: 'text',
        notNull: true,
        comment: 'birthday, anniversary, or other',
      },
      label: {
        type: 'text',
        comment: 'User-defined label (especially for "other" type)',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.contact_dates IS 'Important dates for contacts (birthdays, anniversaries, etc.)'`,
  );

  pgm.addConstraint({ schema: 'contacts', name: 'contact_dates' }, 'valid_date_type', {
    check: "date_type IN ('birthday', 'anniversary', 'other')",
  });

  pgm.createIndex({ schema: 'contacts', name: 'contact_dates' }, 'external_id', {
    name: 'idx_contact_dates_external_id',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_dates' }, 'contact_id', {
    name: 'idx_contact_dates_contact_id',
  });
  // Index for finding upcoming dates (by month and day)
  pgm.sql(`
    CREATE INDEX idx_contact_dates_upcoming
    ON contacts.contact_dates (
      EXTRACT(MONTH FROM date_value),
      EXTRACT(DAY FROM date_value)
    );
  `);

  // ============================================================================
  // Create contact_met_info table (one-to-one with contacts)
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'contact_met_info' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
      },
      contact_id: {
        type: 'integer',
        notNull: true,
        unique: true, // One-to-one relationship
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'CASCADE',
      },
      met_date: {
        type: 'date',
        comment: 'Date when you met this person',
      },
      met_location: {
        type: 'text',
        comment: 'Location where you met',
      },
      met_context: {
        type: 'text',
        comment: 'Context/circumstances of meeting',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.contact_met_info IS 'Information about how/where you met a contact'`,
  );

  pgm.createIndex({ schema: 'contacts', name: 'contact_met_info' }, 'external_id', {
    name: 'idx_contact_met_info_external_id',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_met_info' }, 'contact_id', {
    name: 'idx_contact_met_info_contact_id',
    unique: true,
  });

  // Create trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER update_contact_met_info_updated_at
    BEFORE UPDATE ON contacts.contact_met_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // ============================================================================
  // Create contact_social_profiles table
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'contact_social_profiles' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
      },
      contact_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'contacts', name: 'contacts' },
        onDelete: 'CASCADE',
      },
      platform: {
        type: 'text',
        notNull: true,
        comment: 'Social media platform (linkedin, twitter, facebook, instagram, github, other)',
      },
      profile_url: {
        type: 'text',
        comment: 'Full URL to the profile',
      },
      username: {
        type: 'text',
        comment: 'Username/handle on the platform',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.contact_social_profiles IS 'Social media profiles for contacts'`,
  );

  pgm.addConstraint({ schema: 'contacts', name: 'contact_social_profiles' }, 'valid_platform', {
    check: "platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'github', 'other')",
  });

  pgm.addConstraint(
    { schema: 'contacts', name: 'contact_social_profiles' },
    'url_or_username_required',
    {
      check: 'profile_url IS NOT NULL OR username IS NOT NULL',
    },
  );

  pgm.createIndex({ schema: 'contacts', name: 'contact_social_profiles' }, 'external_id', {
    name: 'idx_contact_social_profiles_external_id',
  });
  pgm.createIndex({ schema: 'contacts', name: 'contact_social_profiles' }, 'contact_id', {
    name: 'idx_contact_social_profiles_contact_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop trigger first
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_contact_met_info_updated_at ON contacts.contact_met_info;',
  );

  // Drop tables in reverse order
  pgm.dropTable({ schema: 'contacts', name: 'contact_social_profiles' }, { cascade: true });
  pgm.dropTable({ schema: 'contacts', name: 'contact_met_info' }, { cascade: true });
  pgm.dropTable({ schema: 'contacts', name: 'contact_dates' }, { cascade: true });

  // Remove columns from contacts table
  pgm.dropColumns({ schema: 'contacts', name: 'contacts' }, [
    'job_title',
    'organization',
    'department',
    'work_notes',
    'interests',
  ]);
}
