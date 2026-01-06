import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 10: Search Functionality (Phase 1 - MVP)
 *
 * Adds:
 * - pg_trgm extension for partial matching
 * - search_vector column on contacts for full-text search
 * - GIN index on search_vector
 * - Trigger function to auto-update search_vector
 * - Trigram indexes on emails and phones for partial matching
 * - search_history table for recent searches
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Enable pg_trgm extension for partial matching (trigrams)
  // ============================================================================
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // ============================================================================
  // Add search_vector column to contacts table
  // ============================================================================
  pgm.addColumn(
    { schema: 'contacts', name: 'contacts' },
    {
      search_vector: {
        type: 'tsvector',
        comment: 'Full-text search vector for contact fields',
      },
    },
  );

  // ============================================================================
  // Create GIN index on search_vector for fast full-text search
  // ============================================================================
  pgm.createIndex({ schema: 'contacts', name: 'contacts' }, 'search_vector', {
    name: 'idx_contacts_search_vector',
    method: 'gin',
  });

  // ============================================================================
  // Create trigger function to auto-update search_vector
  // ============================================================================
  pgm.sql(`
    CREATE OR REPLACE FUNCTION contacts.update_contact_search_vector()
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

  pgm.sql(
    `COMMENT ON FUNCTION contacts.update_contact_search_vector() IS 'Trigger function to update search_vector on contact insert/update'`,
  );

  // ============================================================================
  // Create trigger for automatic search_vector updates
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER contacts_search_vector_update
    BEFORE INSERT OR UPDATE ON contacts.contacts
    FOR EACH ROW EXECUTE FUNCTION contacts.update_contact_search_vector();
  `);

  // ============================================================================
  // Create trigram indexes for partial matching on emails and phones
  // Using raw SQL because node-pg-migrate doesn't support opclass for GIN
  // ============================================================================
  pgm.sql(`
    CREATE INDEX "idx_contact_emails_trgm" ON contacts.contact_emails USING gin (email_address gin_trgm_ops);
  `);

  pgm.sql(`
    CREATE INDEX "idx_contact_phones_trgm" ON contacts.contact_phones USING gin (phone_number gin_trgm_ops);
  `);

  // ============================================================================
  // Create search_history table for recent searches (server-side)
  // ============================================================================
  pgm.createTable(
    { schema: 'contacts', name: 'search_history' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
        comment: 'User who performed the search',
      },
      query: {
        type: 'text',
        notNull: true,
        comment: 'The search query string',
      },
      searched_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
        comment: 'When the search was performed',
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE contacts.search_history IS 'Stores recent search queries for each user'`,
  );

  // Unique constraint on user_id + query (one entry per user per query)
  pgm.addConstraint({ schema: 'contacts', name: 'search_history' }, 'unique_user_query', {
    unique: ['user_id', 'query'],
  });

  // Index for efficient lookup by user, ordered by recency
  pgm.createIndex({ schema: 'contacts', name: 'search_history' }, ['user_id', 'searched_at'], {
    name: 'idx_search_history_user_recent',
  });

  // ============================================================================
  // Backfill existing contacts with search_vector
  // ============================================================================
  pgm.sql(`
    UPDATE contacts.contacts SET updated_at = updated_at;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop search_history table
  pgm.dropTable({ schema: 'contacts', name: 'search_history' }, { cascade: true });

  // Drop trigram indexes
  pgm.sql(`DROP INDEX IF EXISTS contacts.idx_contact_phones_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS contacts.idx_contact_emails_trgm;`);

  // Drop trigger
  pgm.sql(`DROP TRIGGER IF EXISTS contacts_search_vector_update ON contacts.contacts;`);

  // Drop trigger function
  pgm.sql(`DROP FUNCTION IF EXISTS contacts.update_contact_search_vector();`);

  // Drop GIN index
  pgm.dropIndex({ schema: 'contacts', name: 'contacts' }, 'search_vector', {
    name: 'idx_contacts_search_vector',
  });

  // Drop search_vector column
  pgm.dropColumn({ schema: 'contacts', name: 'contacts' }, 'search_vector');

  // Note: We don't drop pg_trgm extension as it might be used elsewhere
}
