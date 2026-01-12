import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Rename Contact to Friend
 *
 * This migration renames the entire contacts domain to friends to align with
 * the brand terminology (docs/brand.md). "Friend" is warmer and more personal
 * than "Contact".
 *
 * Renames:
 * - Schema: contacts → friends
 * - Tables: contacts → friends, contact_* → friend_*
 * - Columns: contact_id → friend_id, related_contact_id → related_friend_id
 * - Column: auth.users.self_contact_id → self_profile_id
 * - Indexes and triggers with "contact" in name
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Rename columns BEFORE renaming tables (due to FK constraints)
  // ============================================================================

  // Rename self_contact_id to self_profile_id in auth.users
  pgm.renameColumn({ schema: 'auth', name: 'users' }, 'self_contact_id', 'self_profile_id');

  // Rename index for self_profile_id
  pgm.sql(`
    ALTER INDEX IF EXISTS auth.idx_users_self_contact_id
    RENAME TO idx_users_self_profile_id;
  `);

  // ============================================================================
  // Step 2: Rename contact_id columns to friend_id in all sub-tables
  // ============================================================================

  // contact_phones
  pgm.renameColumn({ schema: 'contacts', name: 'contact_phones' }, 'contact_id', 'friend_id');

  // contact_emails
  pgm.renameColumn({ schema: 'contacts', name: 'contact_emails' }, 'contact_id', 'friend_id');

  // contact_addresses
  pgm.renameColumn({ schema: 'contacts', name: 'contact_addresses' }, 'contact_id', 'friend_id');

  // contact_urls
  pgm.renameColumn({ schema: 'contacts', name: 'contact_urls' }, 'contact_id', 'friend_id');

  // contact_dates
  pgm.renameColumn({ schema: 'contacts', name: 'contact_dates' }, 'contact_id', 'friend_id');

  // contact_met_info
  pgm.renameColumn({ schema: 'contacts', name: 'contact_met_info' }, 'contact_id', 'friend_id');

  // contact_social_profiles
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_social_profiles' },
    'contact_id',
    'friend_id',
  );

  // contact_relationships - has both contact_id and related_contact_id
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_relationships' },
    'contact_id',
    'friend_id',
  );
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_relationships' },
    'related_contact_id',
    'related_friend_id',
  );

  // ============================================================================
  // Step 3: Drop triggers before renaming tables
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts.contacts;');
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_contact_met_info_updated_at ON contacts.contact_met_info;',
  );
  pgm.sql('DROP TRIGGER IF EXISTS contacts_search_vector_update ON contacts.contacts;');

  // Drop the search vector function (will recreate with new name)
  pgm.sql('DROP FUNCTION IF EXISTS contacts.update_contact_search_vector();');

  // ============================================================================
  // Step 4: Rename tables (in correct order due to FK constraints)
  // ============================================================================

  // First rename sub-tables (they reference the main table)
  pgm.renameTable({ schema: 'contacts', name: 'contact_phones' }, 'friend_phones');
  pgm.renameTable({ schema: 'contacts', name: 'contact_emails' }, 'friend_emails');
  pgm.renameTable({ schema: 'contacts', name: 'contact_addresses' }, 'friend_addresses');
  pgm.renameTable({ schema: 'contacts', name: 'contact_urls' }, 'friend_urls');
  pgm.renameTable({ schema: 'contacts', name: 'contact_dates' }, 'friend_dates');
  pgm.renameTable({ schema: 'contacts', name: 'contact_met_info' }, 'friend_met_info');
  pgm.renameTable(
    { schema: 'contacts', name: 'contact_social_profiles' },
    'friend_social_profiles',
  );
  pgm.renameTable({ schema: 'contacts', name: 'contact_relationships' }, 'friend_relationships');

  // Then rename the main table
  pgm.renameTable({ schema: 'contacts', name: 'contacts' }, 'friends');

  // Rename search_history table (no "contact" in name but in contacts schema)
  // This table stays in the friends schema after schema rename

  // ============================================================================
  // Step 5: Rename the schema
  // ============================================================================
  pgm.sql('ALTER SCHEMA contacts RENAME TO friends;');

  // ============================================================================
  // Step 6: Recreate triggers with new names
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER update_friends_updated_at
    BEFORE UPDATE ON friends.friends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  pgm.sql(`
    CREATE TRIGGER update_friend_met_info_updated_at
    BEFORE UPDATE ON friends.friend_met_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Recreate the search vector function with new name
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

  pgm.sql(
    `COMMENT ON FUNCTION friends.update_friend_search_vector() IS 'Trigger function to update search_vector on friend insert/update'`,
  );

  // Create search vector trigger
  pgm.sql(`
    CREATE TRIGGER friends_search_vector_update
    BEFORE INSERT OR UPDATE ON friends.friends
    FOR EACH ROW EXECUTE FUNCTION friends.update_friend_search_vector();
  `);

  // ============================================================================
  // Step 7: Rename indexes
  // ============================================================================

  // Main friends table indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_external_id RENAME TO idx_friends_external_id;',
  );
  pgm.sql('ALTER INDEX IF EXISTS friends.idx_contacts_user_id RENAME TO idx_friends_user_id;');
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_display_name RENAME TO idx_friends_display_name;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_not_deleted RENAME TO idx_friends_not_deleted;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_created_at RENAME TO idx_friends_created_at;',
  );

  // friend_phones indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_phones_external_id RENAME TO idx_friend_phones_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_phones_contact_id RENAME TO idx_friend_phones_friend_id;',
  );

  // friend_emails indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_emails_external_id RENAME TO idx_friend_emails_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_emails_contact_id RENAME TO idx_friend_emails_friend_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_emails_address RENAME TO idx_friend_emails_address;',
  );

  // friend_addresses indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_addresses_external_id RENAME TO idx_friend_addresses_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_addresses_contact_id RENAME TO idx_friend_addresses_friend_id;',
  );

  // friend_urls indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_urls_external_id RENAME TO idx_friend_urls_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_urls_contact_id RENAME TO idx_friend_urls_friend_id;',
  );

  // friend_dates indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_dates_external_id RENAME TO idx_friend_dates_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_dates_contact_id RENAME TO idx_friend_dates_friend_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_dates_upcoming RENAME TO idx_friend_dates_upcoming;',
  );

  // friend_met_info indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_met_info_external_id RENAME TO idx_friend_met_info_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_met_info_contact_id RENAME TO idx_friend_met_info_friend_id;',
  );

  // friend_social_profiles indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_social_profiles_external_id RENAME TO idx_friend_social_profiles_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_social_profiles_contact_id RENAME TO idx_friend_social_profiles_friend_id;',
  );

  // friend_relationships indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_relationships_external_id RENAME TO idx_friend_relationships_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_relationships_contact_id RENAME TO idx_friend_relationships_friend_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_relationships_related_id RENAME TO idx_friend_relationships_related_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_relationships_contact_type RENAME TO idx_friend_relationships_friend_type;',
  );

  // Full-text search indexes (from full-text-search migration)
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_search_vector RENAME TO idx_friends_search_vector;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_emails_trgm RENAME TO idx_friend_emails_trgm;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_phones_trgm RENAME TO idx_friend_phones_trgm;',
  );

  // Faceted search indexes (from faceted-search-indexes migration)
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_addresses_country RENAME TO idx_friend_addresses_country;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_addresses_city RENAME TO idx_friend_addresses_city;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_organization RENAME TO idx_friends_organization;',
  );
  pgm.sql('ALTER INDEX IF EXISTS friends.idx_contacts_job_title RENAME TO idx_friends_job_title;');
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contacts_department RENAME TO idx_friends_department;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_relationships_notes_trgm RENAME TO idx_friend_relationships_notes_trgm;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS friends.idx_contact_met_info_met_context_trgm RENAME TO idx_friend_met_info_met_context_trgm;',
  );

  // ============================================================================
  // Step 8: Update table comments
  // ============================================================================
  pgm.sql(`COMMENT ON TABLE friends.friends IS 'Friend entries for Freundebuch'`);
  pgm.sql(`COMMENT ON TABLE friends.friend_phones IS 'Phone numbers for friends'`);
  pgm.sql(`COMMENT ON TABLE friends.friend_emails IS 'Email addresses for friends'`);
  pgm.sql(`COMMENT ON TABLE friends.friend_addresses IS 'Postal addresses for friends'`);
  pgm.sql(`COMMENT ON TABLE friends.friend_urls IS 'URLs/websites for friends'`);
  pgm.sql(
    `COMMENT ON TABLE friends.friend_dates IS 'Important dates for friends (birthdays, anniversaries, etc.)'`,
  );
  pgm.sql(
    `COMMENT ON TABLE friends.friend_met_info IS 'Information about how/where you met a friend'`,
  );
  pgm.sql(`COMMENT ON TABLE friends.friend_social_profiles IS 'Social media profiles for friends'`);
  pgm.sql(
    `COMMENT ON TABLE friends.friend_relationships IS 'Relationships between friends (bidirectional)'`,
  );
  pgm.sql(
    `COMMENT ON TABLE friends.relationship_types IS 'Reference table for relationship type definitions'`,
  );

  // Update column comment for self_profile_id
  pgm.sql(
    `COMMENT ON COLUMN auth.users.self_profile_id IS 'Reference to the user''s profile (first friendbook entry)'`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Rename schema back
  // ============================================================================
  pgm.sql('ALTER SCHEMA friends RENAME TO contacts;');

  // ============================================================================
  // Step 2: Drop triggers and functions
  // ============================================================================
  pgm.sql('DROP TRIGGER IF EXISTS update_friends_updated_at ON contacts.friends;');
  pgm.sql('DROP TRIGGER IF EXISTS update_friend_met_info_updated_at ON contacts.friend_met_info;');
  pgm.sql('DROP TRIGGER IF EXISTS friends_search_vector_update ON contacts.friends;');
  pgm.sql('DROP FUNCTION IF EXISTS contacts.update_friend_search_vector();');

  // ============================================================================
  // Step 3: Rename tables back
  // ============================================================================
  pgm.renameTable({ schema: 'contacts', name: 'friends' }, 'contacts');
  pgm.renameTable({ schema: 'contacts', name: 'friend_phones' }, 'contact_phones');
  pgm.renameTable({ schema: 'contacts', name: 'friend_emails' }, 'contact_emails');
  pgm.renameTable({ schema: 'contacts', name: 'friend_addresses' }, 'contact_addresses');
  pgm.renameTable({ schema: 'contacts', name: 'friend_urls' }, 'contact_urls');
  pgm.renameTable({ schema: 'contacts', name: 'friend_dates' }, 'contact_dates');
  pgm.renameTable({ schema: 'contacts', name: 'friend_met_info' }, 'contact_met_info');
  pgm.renameTable(
    { schema: 'contacts', name: 'friend_social_profiles' },
    'contact_social_profiles',
  );
  pgm.renameTable({ schema: 'contacts', name: 'friend_relationships' }, 'contact_relationships');

  // ============================================================================
  // Step 4: Rename columns back
  // ============================================================================
  pgm.renameColumn({ schema: 'contacts', name: 'contact_phones' }, 'friend_id', 'contact_id');
  pgm.renameColumn({ schema: 'contacts', name: 'contact_emails' }, 'friend_id', 'contact_id');
  pgm.renameColumn({ schema: 'contacts', name: 'contact_addresses' }, 'friend_id', 'contact_id');
  pgm.renameColumn({ schema: 'contacts', name: 'contact_urls' }, 'friend_id', 'contact_id');
  pgm.renameColumn({ schema: 'contacts', name: 'contact_dates' }, 'friend_id', 'contact_id');
  pgm.renameColumn({ schema: 'contacts', name: 'contact_met_info' }, 'friend_id', 'contact_id');
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_social_profiles' },
    'friend_id',
    'contact_id',
  );
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_relationships' },
    'friend_id',
    'contact_id',
  );
  pgm.renameColumn(
    { schema: 'contacts', name: 'contact_relationships' },
    'related_friend_id',
    'related_contact_id',
  );

  // Rename self_profile_id back to self_contact_id
  pgm.renameColumn({ schema: 'auth', name: 'users' }, 'self_profile_id', 'self_contact_id');

  // ============================================================================
  // Step 5: Rename indexes back
  // ============================================================================
  pgm.sql(
    'ALTER INDEX IF EXISTS auth.idx_users_self_profile_id RENAME TO idx_users_self_contact_id;',
  );

  // Main contacts table indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_external_id RENAME TO idx_contacts_external_id;',
  );
  pgm.sql('ALTER INDEX IF EXISTS contacts.idx_friends_user_id RENAME TO idx_contacts_user_id;');
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_display_name RENAME TO idx_contacts_display_name;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_not_deleted RENAME TO idx_contacts_not_deleted;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_created_at RENAME TO idx_contacts_created_at;',
  );

  // contact_phones indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_phones_external_id RENAME TO idx_contact_phones_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_phones_friend_id RENAME TO idx_contact_phones_contact_id;',
  );

  // contact_emails indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_emails_external_id RENAME TO idx_contact_emails_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_emails_friend_id RENAME TO idx_contact_emails_contact_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_emails_address RENAME TO idx_contact_emails_address;',
  );

  // contact_addresses indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_addresses_external_id RENAME TO idx_contact_addresses_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_addresses_friend_id RENAME TO idx_contact_addresses_contact_id;',
  );

  // contact_urls indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_urls_external_id RENAME TO idx_contact_urls_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_urls_friend_id RENAME TO idx_contact_urls_contact_id;',
  );

  // contact_dates indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_dates_external_id RENAME TO idx_contact_dates_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_dates_friend_id RENAME TO idx_contact_dates_contact_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_dates_upcoming RENAME TO idx_contact_dates_upcoming;',
  );

  // contact_met_info indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_met_info_external_id RENAME TO idx_contact_met_info_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_met_info_friend_id RENAME TO idx_contact_met_info_contact_id;',
  );

  // contact_social_profiles indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_social_profiles_external_id RENAME TO idx_contact_social_profiles_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_social_profiles_friend_id RENAME TO idx_contact_social_profiles_contact_id;',
  );

  // contact_relationships indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_relationships_external_id RENAME TO idx_contact_relationships_external_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_relationships_friend_id RENAME TO idx_contact_relationships_contact_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_relationships_related_id RENAME TO idx_contact_relationships_related_id;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_relationships_friend_type RENAME TO idx_contact_relationships_contact_type;',
  );

  // Full-text search indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_search_vector RENAME TO idx_contacts_search_vector;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_emails_trgm RENAME TO idx_contact_emails_trgm;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_phones_trgm RENAME TO idx_contact_phones_trgm;',
  );

  // Faceted search indexes
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_addresses_country RENAME TO idx_contact_addresses_country;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_addresses_city RENAME TO idx_contact_addresses_city;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_organization RENAME TO idx_contacts_organization;',
  );
  pgm.sql('ALTER INDEX IF EXISTS contacts.idx_friends_job_title RENAME TO idx_contacts_job_title;');
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friends_department RENAME TO idx_contacts_department;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_relationships_notes_trgm RENAME TO idx_contact_relationships_notes_trgm;',
  );
  pgm.sql(
    'ALTER INDEX IF EXISTS contacts.idx_friend_met_info_met_context_trgm RENAME TO idx_contact_met_info_met_context_trgm;',
  );

  // ============================================================================
  // Step 6: Recreate original triggers
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  pgm.sql(`
    CREATE TRIGGER update_contact_met_info_updated_at
    BEFORE UPDATE ON contacts.contact_met_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Recreate search vector function and trigger
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

  pgm.sql(`
    CREATE TRIGGER contacts_search_vector_update
    BEFORE INSERT OR UPDATE ON contacts.contacts
    FOR EACH ROW EXECUTE FUNCTION contacts.update_contact_search_vector();
  `);

  // ============================================================================
  // Step 7: Restore original table comments
  // ============================================================================
  pgm.sql(`COMMENT ON TABLE contacts.contacts IS 'Contact entries for Freundebuch'`);
  pgm.sql(`COMMENT ON TABLE contacts.contact_phones IS 'Phone numbers for contacts'`);
  pgm.sql(`COMMENT ON TABLE contacts.contact_emails IS 'Email addresses for contacts'`);
  pgm.sql(`COMMENT ON TABLE contacts.contact_addresses IS 'Postal addresses for contacts'`);
  pgm.sql(`COMMENT ON TABLE contacts.contact_urls IS 'URLs/websites for contacts'`);
  pgm.sql(
    `COMMENT ON TABLE contacts.contact_dates IS 'Important dates for contacts (birthdays, anniversaries, etc.)'`,
  );
  pgm.sql(
    `COMMENT ON TABLE contacts.contact_met_info IS 'Information about how/where you met a contact'`,
  );
  pgm.sql(
    `COMMENT ON TABLE contacts.contact_social_profiles IS 'Social media profiles for contacts'`,
  );
  pgm.sql(
    `COMMENT ON TABLE contacts.contact_relationships IS 'Relationships between contacts (bidirectional)'`,
  );
  pgm.sql(
    `COMMENT ON TABLE contacts.relationship_types IS 'Reference table for relationship type definitions'`,
  );

  pgm.sql(
    `COMMENT ON COLUMN auth.users.self_contact_id IS 'Reference to the user''s self-contact (first friendbook entry)'`,
  );
}
