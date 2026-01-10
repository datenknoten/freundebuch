import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 10 Enhancement: Faceted Search Indexes
 *
 * Adds indexes to support efficient faceted search filtering:
 * - Location facets: country, city on contact_addresses
 * - Professional facets: organization, job_title, department on contacts
 * - Trigram indexes for ILIKE searches on notes and met_context
 *
 * Note: Relationship category facets use existing relationship_types table
 * which is already indexed.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Enable pg_trgm extension for trigram indexes (supports ILIKE searches)
  // ============================================================================
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  // ============================================================================
  // Location facet indexes on contact_addresses
  // ============================================================================
  pgm.createIndex({ schema: 'contacts', name: 'contact_addresses' }, 'country', {
    name: 'idx_contact_addresses_country',
    where: 'country IS NOT NULL',
  });

  pgm.createIndex({ schema: 'contacts', name: 'contact_addresses' }, 'city', {
    name: 'idx_contact_addresses_city',
    where: 'city IS NOT NULL',
  });

  // ============================================================================
  // Professional facet indexes on contacts
  // Partial indexes exclude NULL values and soft-deleted contacts
  // ============================================================================
  pgm.createIndex({ schema: 'contacts', name: 'contacts' }, 'organization', {
    name: 'idx_contacts_organization',
    where: 'organization IS NOT NULL AND deleted_at IS NULL',
  });

  pgm.createIndex({ schema: 'contacts', name: 'contacts' }, 'job_title', {
    name: 'idx_contacts_job_title',
    where: 'job_title IS NOT NULL AND deleted_at IS NULL',
  });

  pgm.createIndex({ schema: 'contacts', name: 'contacts' }, 'department', {
    name: 'idx_contacts_department',
    where: 'department IS NOT NULL AND deleted_at IS NULL',
  });

  // ============================================================================
  // Trigram indexes for ILIKE text searches
  // These support efficient partial matching on notes and met_context fields
  // ============================================================================
  pgm.sql(`
    CREATE INDEX idx_contact_relationships_notes_trgm
    ON contacts.contact_relationships USING gin (notes gin_trgm_ops)
    WHERE notes IS NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX idx_contact_met_info_met_context_trgm
    ON contacts.contact_met_info USING gin (met_context gin_trgm_ops)
    WHERE met_context IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop trigram indexes
  pgm.sql('DROP INDEX IF EXISTS contacts.idx_contact_met_info_met_context_trgm;');
  pgm.sql('DROP INDEX IF EXISTS contacts.idx_contact_relationships_notes_trgm;');

  // Drop professional facet indexes
  pgm.dropIndex({ schema: 'contacts', name: 'contacts' }, 'department', {
    name: 'idx_contacts_department',
  });
  pgm.dropIndex({ schema: 'contacts', name: 'contacts' }, 'job_title', {
    name: 'idx_contacts_job_title',
  });
  pgm.dropIndex({ schema: 'contacts', name: 'contacts' }, 'organization', {
    name: 'idx_contacts_organization',
  });

  // Drop location facet indexes
  pgm.dropIndex({ schema: 'contacts', name: 'contact_addresses' }, 'city', {
    name: 'idx_contact_addresses_city',
  });
  pgm.dropIndex({ schema: 'contacts', name: 'contact_addresses' }, 'country', {
    name: 'idx_contact_addresses_country',
  });

  // Note: We don't drop the pg_trgm extension as other parts of the system may use it
}
