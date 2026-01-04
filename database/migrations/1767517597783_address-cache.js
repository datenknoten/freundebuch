/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Create address_cache table for persistent caching of external API responses
  pgm.createTable(
    { schema: 'public', name: 'address_cache' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
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
    `COMMENT ON TABLE public.address_cache IS 'Persistent cache for address lookup API responses (ZipcodeBase, Overpass)'`,
  );

  // Create indexes
  pgm.createIndex({ schema: 'public', name: 'address_cache' }, 'cache_key', {
    name: 'idx_address_cache_key',
  });
  pgm.createIndex({ schema: 'public', name: 'address_cache' }, 'expires_at', {
    name: 'idx_address_cache_expires_at',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable({ schema: 'public', name: 'address_cache' }, { cascade: true });
};
