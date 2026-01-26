import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable PostGIS extension for spatial data support
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS postgis;`);

  // Create geodata schema
  pgm.createSchema('geodata', { ifNotExists: true });
  pgm.sql(`COMMENT ON SCHEMA geodata IS 'OpenStreetMap address data for autocomplete'`);

  // Create import_batches table first (referenced by addresses)
  pgm.createTable(
    { schema: 'geodata', name: 'import_batches' },
    {
      id: {
        type: 'bigserial',
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
      country_code: {
        type: 'text',
        notNull: true,
        comment: 'ISO 3166-1 alpha-2 country code',
      },
      region: {
        type: 'text',
        comment: 'Region identifier (e.g., "rheinland-pfalz"), NULL for country-wide imports',
      },
      source_file: {
        type: 'text',
        notNull: true,
        comment: 'Name of the source PBF file',
      },
      source_timestamp: {
        type: 'timestamptz',
        comment: 'Timestamp of the OSM data extract',
      },
      record_count: {
        type: 'integer',
        comment: 'Number of addresses imported',
      },
      started_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      completed_at: {
        type: 'timestamptz',
        comment: 'When the import completed',
      },
      status: {
        type: 'text',
        notNull: true,
        default: 'running',
        comment: 'Import status: running, completed, failed',
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

  pgm.sql(`COMMENT ON TABLE geodata.import_batches IS 'Tracks OSM data import jobs'`);

  // Add check constraint for status
  pgm.addConstraint({ schema: 'geodata', name: 'import_batches' }, 'chk_import_status', {
    check: `status IN ('running', 'completed', 'failed')`,
  });

  // Create indexes for import_batches
  pgm.createIndex({ schema: 'geodata', name: 'import_batches' }, 'external_id', {
    name: 'idx_import_batches_external_id',
  });
  pgm.createIndex({ schema: 'geodata', name: 'import_batches' }, 'status', {
    name: 'idx_import_batches_status',
  });

  // Create updated_at trigger for import_batches
  pgm.sql(`
    CREATE TRIGGER update_import_batches_updated_at
      BEFORE UPDATE ON geodata.import_batches
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create main addresses table
  pgm.createTable(
    { schema: 'geodata', name: 'addresses' },
    {
      id: {
        type: 'bigserial',
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
      country_code: {
        type: 'text',
        notNull: true,
        comment: 'ISO 3166-1 alpha-2 country code',
      },
      postal_code: {
        type: 'text',
        notNull: true,
        comment: 'Postal/ZIP code',
      },
      city: {
        type: 'text',
        notNull: true,
        comment: 'City name (from addr:city or addr:place)',
      },
      street: {
        type: 'text',
        notNull: true,
        comment: 'Street name',
      },
      house_number: {
        type: 'text',
        comment: 'House number (NULL for street-only entries)',
      },
      osm_id: {
        type: 'bigint',
        comment: 'Original OpenStreetMap ID for updates',
      },
      osm_type: {
        type: 'text',
        comment: 'OSM element type: node, way, or relation',
      },
      import_batch_id: {
        type: 'uuid',
        notNull: true,
        comment: 'Reference to the import batch',
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

  pgm.sql(`COMMENT ON TABLE geodata.addresses IS 'OSM address data for autocomplete lookups'`);

  // Add location column using PostGIS geometry type
  pgm.sql(`ALTER TABLE geodata.addresses ADD COLUMN location GEOMETRY(Point, 4326)`);
  pgm.sql(`COMMENT ON COLUMN geodata.addresses.location IS 'WGS84 coordinates (SRID 4326)'`);

  // Create indexes for addresses table
  pgm.createIndex({ schema: 'geodata', name: 'addresses' }, 'external_id', {
    name: 'idx_addresses_external_id',
  });
  pgm.createIndex(
    { schema: 'geodata', name: 'addresses' },
    ['country_code', 'postal_code', 'street'],
    {
      name: 'idx_addresses_postal_street',
    },
  );
  pgm.createIndex(
    { schema: 'geodata', name: 'addresses' },
    ['country_code', 'postal_code', 'street', 'house_number'],
    {
      name: 'idx_addresses_housenumber',
      where: 'house_number IS NOT NULL',
    },
  );
  pgm.createIndex({ schema: 'geodata', name: 'addresses' }, 'import_batch_id', {
    name: 'idx_addresses_import_batch',
  });

  // Create spatial index using GIST
  pgm.sql(`CREATE INDEX idx_addresses_location ON geodata.addresses USING GIST(location)`);

  // Create updated_at trigger for addresses
  pgm.sql(`
    CREATE TRIGGER update_addresses_updated_at
      BEFORE UPDATE ON geodata.addresses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create materialized views for fast DISTINCT queries
  pgm.sql(`
    CREATE MATERIALIZED VIEW geodata.streets_by_postal AS
    SELECT DISTINCT country_code, postal_code, street
    FROM geodata.addresses;

    COMMENT ON MATERIALIZED VIEW geodata.streets_by_postal IS 'Pre-computed distinct streets by postal code for fast lookups';
  `);

  pgm.sql(`
    CREATE MATERIALIZED VIEW geodata.housenumbers_by_street AS
    SELECT DISTINCT country_code, postal_code, street, house_number
    FROM geodata.addresses
    WHERE house_number IS NOT NULL;

    COMMENT ON MATERIALIZED VIEW geodata.housenumbers_by_street IS 'Pre-computed distinct house numbers by street for fast lookups';
  `);

  // Create indexes on materialized views
  pgm.sql(`
    CREATE UNIQUE INDEX idx_streets_by_postal ON geodata.streets_by_postal(country_code, postal_code, street);
    CREATE INDEX idx_housenumbers_by_street ON geodata.housenumbers_by_street(country_code, postal_code, street);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop materialized views first
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS geodata.housenumbers_by_street CASCADE');
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS geodata.streets_by_postal CASCADE');

  // Drop triggers
  pgm.sql('DROP TRIGGER IF EXISTS update_addresses_updated_at ON geodata.addresses');
  pgm.sql('DROP TRIGGER IF EXISTS update_import_batches_updated_at ON geodata.import_batches');

  // Drop tables
  pgm.dropTable({ schema: 'geodata', name: 'addresses' }, { cascade: true });
  pgm.dropTable({ schema: 'geodata', name: 'import_batches' }, { cascade: true });

  // Drop schema
  pgm.dropSchema('geodata', { cascade: true });

  // Drop PostGIS extension (be careful - this may affect other data)
  pgm.sql('DROP EXTENSION IF EXISTS postgis CASCADE');
}
