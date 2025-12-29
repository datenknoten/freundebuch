import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create contacts table
  pgm.createTable('contacts', {
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
    user_id: {
      type: 'integer',
      notNull: true,
      references: { schema: 'auth', name: 'users' },
      onDelete: 'CASCADE',
      comment: 'Owner of this contact',
    },
    // Name fields
    display_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Primary name shown in lists',
    },
    name_prefix: {
      type: 'varchar(50)',
      comment: 'Dr., Mr., Ms., Prof., etc.',
    },
    name_first: {
      type: 'varchar(100)',
      comment: 'First/given name',
    },
    name_middle: {
      type: 'varchar(100)',
      comment: 'Middle name(s)',
    },
    name_last: {
      type: 'varchar(100)',
      comment: 'Last/family name',
    },
    name_suffix: {
      type: 'varchar(50)',
      comment: 'Jr., Sr., III, PhD, etc.',
    },
    // Profile picture
    photo_url: {
      type: 'varchar(500)',
      comment: 'URL to original profile picture',
    },
    photo_thumbnail_url: {
      type: 'varchar(500)',
      comment: 'URL to 200x200 thumbnail',
    },
    // Timestamps
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
    deleted_at: {
      type: 'timestamptz',
      comment: 'Soft delete timestamp',
    },
  });

  pgm.sql(`COMMENT ON TABLE contacts IS 'Contact entries for Freundebuch'`);

  // Add constraint for non-empty display_name
  pgm.addConstraint('contacts', 'contacts_display_name_not_empty', {
    check: 'LENGTH(TRIM(display_name)) > 0',
  });

  // Create indexes for contacts
  pgm.createIndex('contacts', 'external_id', { name: 'idx_contacts_external_id' });
  pgm.createIndex('contacts', 'user_id', { name: 'idx_contacts_user_id' });
  pgm.createIndex('contacts', ['user_id', 'display_name'], { name: 'idx_contacts_display_name' });
  pgm.createIndex('contacts', 'deleted_at', {
    name: 'idx_contacts_not_deleted',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('contacts', ['user_id', 'created_at'], {
    name: 'idx_contacts_created_at',
    method: 'btree',
  });

  // Create trigger for contacts updated_at
  pgm.sql(`
    CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create contact_phones table
  pgm.createTable('contact_phones', {
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
      references: 'contacts',
      onDelete: 'CASCADE',
    },
    phone_number: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Phone number (stored in E.164 format when possible)',
    },
    phone_type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'mobile'",
      comment: 'mobile, home, work, fax, other',
    },
    label: {
      type: 'varchar(100)',
      comment: 'User-defined label',
    },
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql(`COMMENT ON TABLE contact_phones IS 'Phone numbers for contacts'`);

  pgm.addConstraint('contact_phones', 'valid_phone_type', {
    check: "phone_type IN ('mobile', 'home', 'work', 'fax', 'other')",
  });

  pgm.createIndex('contact_phones', 'external_id', { name: 'idx_contact_phones_external_id' });
  pgm.createIndex('contact_phones', 'contact_id', { name: 'idx_contact_phones_contact_id' });

  // Create contact_emails table
  pgm.createTable('contact_emails', {
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
      references: 'contacts',
      onDelete: 'CASCADE',
    },
    email_address: {
      type: 'varchar(255)',
      notNull: true,
    },
    email_type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'personal'",
      comment: 'personal, work, other',
    },
    label: {
      type: 'varchar(100)',
      comment: 'User-defined label',
    },
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql(`COMMENT ON TABLE contact_emails IS 'Email addresses for contacts'`);

  pgm.addConstraint('contact_emails', 'valid_email_type', {
    check: "email_type IN ('personal', 'work', 'other')",
  });

  // Basic email format check - allows most valid emails
  pgm.addConstraint('contact_emails', 'valid_email_format', {
    check: "email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
  });

  pgm.createIndex('contact_emails', 'external_id', { name: 'idx_contact_emails_external_id' });
  pgm.createIndex('contact_emails', 'contact_id', { name: 'idx_contact_emails_contact_id' });
  pgm.createIndex('contact_emails', 'email_address', { name: 'idx_contact_emails_address' });

  // Create contact_addresses table
  pgm.createTable('contact_addresses', {
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
      references: 'contacts',
      onDelete: 'CASCADE',
    },
    street_line1: {
      type: 'varchar(255)',
    },
    street_line2: {
      type: 'varchar(255)',
    },
    city: {
      type: 'varchar(100)',
    },
    state_province: {
      type: 'varchar(100)',
    },
    postal_code: {
      type: 'varchar(20)',
    },
    country: {
      type: 'varchar(100)',
    },
    address_type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'home'",
      comment: 'home, work, other',
    },
    label: {
      type: 'varchar(100)',
      comment: 'User-defined label',
    },
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql(`COMMENT ON TABLE contact_addresses IS 'Postal addresses for contacts'`);

  pgm.addConstraint('contact_addresses', 'valid_address_type', {
    check: "address_type IN ('home', 'work', 'other')",
  });

  pgm.createIndex('contact_addresses', 'external_id', {
    name: 'idx_contact_addresses_external_id',
  });
  pgm.createIndex('contact_addresses', 'contact_id', { name: 'idx_contact_addresses_contact_id' });

  // Create contact_urls table
  pgm.createTable('contact_urls', {
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
      references: 'contacts',
      onDelete: 'CASCADE',
    },
    url: {
      type: 'varchar(500)',
      notNull: true,
    },
    url_type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'personal'",
      comment: 'personal, work, blog, other',
    },
    label: {
      type: 'varchar(100)',
      comment: 'User-defined label',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql(`COMMENT ON TABLE contact_urls IS 'URLs/websites for contacts'`);

  pgm.addConstraint('contact_urls', 'valid_url_type', {
    check: "url_type IN ('personal', 'work', 'blog', 'other')",
  });

  pgm.createIndex('contact_urls', 'external_id', { name: 'idx_contact_urls_external_id' });
  pgm.createIndex('contact_urls', 'contact_id', { name: 'idx_contact_urls_contact_id' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop trigger first
  pgm.sql('DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;');

  // Drop tables in reverse order (children before parent)
  pgm.dropTable('contact_urls', { cascade: true });
  pgm.dropTable('contact_addresses', { cascade: true });
  pgm.dropTable('contact_emails', { cascade: true });
  pgm.dropTable('contact_phones', { cascade: true });
  pgm.dropTable('contacts', { cascade: true });
}
