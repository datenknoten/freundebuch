import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 12: Collectives Subresources
 *
 * This migration adds subresource tables for collectives, mirroring the pattern used for friends:
 * - collectives.collective_phones
 * - collectives.collective_emails
 * - collectives.collective_addresses
 * - collectives.collective_urls
 * - collectives.collective_circle_memberships (junction table for circles)
 *
 * This allows collectives (families, companies, clubs) to have their own contact information
 * independent of individual friend contact info.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // Step 1: Create collective_phones table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_phones' },
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
        comment: 'Public UUID for API exposure (always use this in APIs)',
      },
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective this phone number belongs to',
      },
      phone_number: {
        type: 'varchar(50)',
        notNull: true,
        comment: 'The phone number',
      },
      phone_type: {
        type: 'varchar(20)',
        notNull: true,
        default: "'work'",
        comment: 'Type of phone: mobile, home, work, fax, other',
      },
      label: {
        type: 'varchar(100)',
        comment: 'Custom label for this phone number',
      },
      is_primary: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'Whether this is the primary phone number',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_phones IS 'Phone numbers associated with collectives'`,
  );

  // Constraint for phone_type values
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_phones' },
    'collective_phones_type_check',
    {
      check: "phone_type IN ('mobile', 'home', 'work', 'fax', 'other')",
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_phones' }, 'external_id', {
    name: 'idx_collective_phones_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_phones' }, 'collective_id', {
    name: 'idx_collective_phones_collective_id',
  });

  // ============================================================================
  // Step 2: Create collective_emails table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_emails' },
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
        comment: 'Public UUID for API exposure (always use this in APIs)',
      },
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective this email belongs to',
      },
      email_address: {
        type: 'varchar(255)',
        notNull: true,
        comment: 'The email address',
      },
      email_type: {
        type: 'varchar(20)',
        notNull: true,
        default: "'work'",
        comment: 'Type of email: personal, work, other',
      },
      label: {
        type: 'varchar(100)',
        comment: 'Custom label for this email',
      },
      is_primary: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'Whether this is the primary email',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_emails IS 'Email addresses associated with collectives'`,
  );

  // Constraint for email_type values
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_emails' },
    'collective_emails_type_check',
    {
      check: "email_type IN ('personal', 'work', 'other')",
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_emails' }, 'external_id', {
    name: 'idx_collective_emails_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_emails' }, 'collective_id', {
    name: 'idx_collective_emails_collective_id',
  });

  // ============================================================================
  // Step 3: Create collective_addresses table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_addresses' },
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
        comment: 'Public UUID for API exposure (always use this in APIs)',
      },
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective this address belongs to',
      },
      street_line1: {
        type: 'text',
        comment: 'Street address line 1',
      },
      street_line2: {
        type: 'text',
        comment: 'Street address line 2 (apt, suite, etc.)',
      },
      city: {
        type: 'varchar(100)',
        comment: 'City name',
      },
      state_province: {
        type: 'varchar(100)',
        comment: 'State or province',
      },
      postal_code: {
        type: 'varchar(20)',
        comment: 'Postal or ZIP code',
      },
      country: {
        type: 'varchar(100)',
        comment: 'Country name',
      },
      address_type: {
        type: 'varchar(20)',
        notNull: true,
        default: "'work'",
        comment: 'Type of address: home, work, other',
      },
      label: {
        type: 'varchar(100)',
        comment: 'Custom label for this address',
      },
      is_primary: {
        type: 'boolean',
        notNull: true,
        default: false,
        comment: 'Whether this is the primary address',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_addresses IS 'Physical addresses associated with collectives'`,
  );

  // Constraint for address_type values
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_addresses' },
    'collective_addresses_type_check',
    {
      check: "address_type IN ('home', 'work', 'other')",
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_addresses' }, 'external_id', {
    name: 'idx_collective_addresses_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_addresses' }, 'collective_id', {
    name: 'idx_collective_addresses_collective_id',
  });

  // ============================================================================
  // Step 4: Create collective_urls table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_urls' },
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
        comment: 'Public UUID for API exposure (always use this in APIs)',
      },
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective this URL belongs to',
      },
      url: {
        type: 'text',
        notNull: true,
        comment: 'The URL',
      },
      url_type: {
        type: 'varchar(20)',
        notNull: true,
        default: "'work'",
        comment: 'Type of URL: personal, work, blog, other',
      },
      label: {
        type: 'varchar(100)',
        comment: 'Custom label for this URL',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_urls IS 'URLs/websites associated with collectives'`,
  );

  // Constraint for url_type values
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_urls' },
    'collective_urls_type_check',
    {
      check: "url_type IN ('personal', 'work', 'blog', 'other')",
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_urls' }, 'external_id', {
    name: 'idx_collective_urls_external_id',
    unique: true,
  });

  pgm.createIndex({ schema: 'collectives', name: 'collective_urls' }, 'collective_id', {
    name: 'idx_collective_urls_collective_id',
  });

  // ============================================================================
  // Step 5: Create collective_circle_memberships junction table
  // ============================================================================
  pgm.createTable(
    { schema: 'collectives', name: 'collective_circle_memberships' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      collective_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'collectives', name: 'collectives' },
        onDelete: 'CASCADE',
        comment: 'The collective',
      },
      circle_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'friends', name: 'circles' },
        onDelete: 'CASCADE',
        comment: 'The circle this collective belongs to',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(
    `COMMENT ON TABLE collectives.collective_circle_memberships IS 'Junction table linking collectives to circles'`,
  );

  // Unique constraint: one membership per collective per circle
  pgm.addConstraint(
    { schema: 'collectives', name: 'collective_circle_memberships' },
    'unique_collective_circle',
    {
      unique: [['collective_id', 'circle_id']],
    },
  );

  pgm.createIndex(
    { schema: 'collectives', name: 'collective_circle_memberships' },
    'collective_id',
    {
      name: 'idx_collective_circle_memberships_collective_id',
    },
  );

  pgm.createIndex({ schema: 'collectives', name: 'collective_circle_memberships' }, 'circle_id', {
    name: 'idx_collective_circle_memberships_circle_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order of creation

  // Step 5: Drop collective_circle_memberships
  pgm.dropTable(
    { schema: 'collectives', name: 'collective_circle_memberships' },
    { cascade: true },
  );

  // Step 4: Drop collective_urls
  pgm.dropTable({ schema: 'collectives', name: 'collective_urls' }, { cascade: true });

  // Step 3: Drop collective_addresses
  pgm.dropTable({ schema: 'collectives', name: 'collective_addresses' }, { cascade: true });

  // Step 2: Drop collective_emails
  pgm.dropTable({ schema: 'collectives', name: 'collective_emails' }, { cascade: true });

  // Step 1: Drop collective_phones
  pgm.dropTable({ schema: 'collectives', name: 'collective_phones' }, { cascade: true });
}
