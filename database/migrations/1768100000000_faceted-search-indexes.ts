import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 10 Enhancement: Faceted Search Indexes
 *
 * Adds indexes to support efficient faceted search filtering:
 * - Location facets: country, city on contact_addresses
 * - Professional facets: organization, job_title, department on contacts
 *
 * Note: Relationship category facets use existing relationship_types table
 * which is already indexed.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
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
}

export async function down(pgm: MigrationBuilder): Promise<void> {
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
}
