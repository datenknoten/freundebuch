import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create system schema if it doesn't exist
  pgm.createSchema('system', { ifNotExists: true });

  // Create address_cache table for persistent caching of external API responses
  pgm.createTable(
    { schema: 'system', name: 'address_cache' },
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
      cache_key: {
        type: 'text',
        notNull: true,
        unique: true,
        comment: 'Cache key (e.g., "countries", "cities:DE:12345")',
      },
      cache_value: {
        type: 'jsonb',
        notNull: true,
        comment: 'Cached JSON data from external API',
      },
      expires_at: {
        type: 'timestamptz',
        notNull: true,
        comment: 'When this cache entry expires',
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

  // Add table comment
  pgm.sql(
    `COMMENT ON TABLE system.address_cache IS 'Persistent cache for address lookup API responses (ZipcodeBase, Overpass)'`,
  );

  // Create indexes
  pgm.createIndex({ schema: 'system', name: 'address_cache' }, 'external_id', {
    name: 'idx_address_cache_external_id',
  });
  pgm.createIndex({ schema: 'system', name: 'address_cache' }, 'cache_key', {
    name: 'idx_address_cache_key',
  });
  pgm.createIndex({ schema: 'system', name: 'address_cache' }, 'expires_at', {
    name: 'idx_address_cache_expires_at',
  });

  // Create updated_at trigger
  pgm.sql(`
    CREATE TRIGGER update_address_cache_updated_at
      BEFORE UPDATE ON system.address_cache
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TRIGGER IF EXISTS update_address_cache_updated_at ON system.address_cache');
  pgm.dropTable({ schema: 'system', name: 'address_cache' }, { cascade: true });
}
