import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Schema housekeeping: index debt, one type mismatch, one missing FK, and
 * `updated_at` on the sub-resource tables.
 */

/** Duplicates of the index a UNIQUE constraint already creates. */
const DUPLICATE_INDEXES = [
  {
    schema: 'auth',
    name: 'idx_ba_user_email',
    recreate: 'CREATE INDEX idx_ba_user_email ON auth."user" (email)',
  },
  {
    schema: 'auth',
    name: 'idx_ba_session_token',
    recreate: 'CREATE INDEX idx_ba_session_token ON auth.session (token)',
  },
  {
    schema: 'auth',
    name: 'idx_ba_passkey_credential_id',
    recreate: 'CREATE UNIQUE INDEX idx_ba_passkey_credential_id ON auth.passkey (credential_id)',
  },
  {
    schema: 'system',
    name: 'idx_address_cache_key',
    recreate: 'CREATE INDEX idx_address_cache_key ON system.address_cache (cache_key)',
  },
] as const;

/** Indexes no query can use. */
const DEAD_INDEXES = [
  {
    schema: 'friends',
    name: 'idx_friend_dates_upcoming',
    // GetUpcomingDates projects EXTRACT(month/day) but filters on the user, so
    // the planner can never reach this expression index.
    recreate:
      'CREATE INDEX idx_friend_dates_upcoming ON friends.friend_dates (EXTRACT(month FROM date_value), EXTRACT(day FROM date_value))',
  },
  {
    schema: 'friends',
    name: 'idx_friend_emails_address',
    // Every lookup on email_address is `ILIKE '%…%'`, which a btree cannot
    // serve; nothing does an equality lookup on it.
    recreate: 'CREATE INDEX idx_friend_emails_address ON friends.friend_emails (email_address)',
  },
] as const;

/** Left-prefix of a wider composite index that every query already uses. */
const REDUNDANT_PREFIX_INDEXES = [
  {
    schema: 'friends',
    name: 'idx_friends_user_id',
    covered_by: 'idx_friends_display_name (user_id, display_name)',
    recreate: 'CREATE INDEX idx_friends_user_id ON friends.friends (user_id)',
  },
  {
    schema: 'encounters',
    name: 'idx_encounters_user_id',
    covered_by: 'idx_encounters_user_date (user_id, encounter_date)',
    recreate: 'CREATE INDEX idx_encounters_user_id ON encounters.encounters (user_id)',
  },
  {
    schema: 'friends',
    name: 'idx_circles_user_id',
    covered_by: 'idx_circles_sort_order (user_id, sort_order)',
    recreate: 'CREATE INDEX idx_circles_user_id ON friends.circles (user_id)',
  },
] as const;

/** User-editable sub-resources that had only `created_at`. */
const SUB_RESOURCE_TABLES = [
  'friends.friend_phones',
  'friends.friend_emails',
  'friends.friend_addresses',
  'friends.friend_urls',
  'friends.friend_dates',
  'friends.friend_social_profiles',
  'friends.friend_professional_history',
  'collectives.collective_phones',
  'collectives.collective_emails',
  'collectives.collective_addresses',
  'collectives.collective_urls',
] as const;

function triggerName(table: string): string {
  return `update_${table.split('.')[1]}_updated_at`;
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  // geodata.addresses.id is bigint, so a bigint FK column needs a bigint
  // reference. The integer column silently caps at 2^31 rows.
  pgm.sql(`ALTER TABLE encounters.encounters ALTER COLUMN location_address_id TYPE bigint;`);

  // The OSM import deletes a batch's addresses by external_id
  // (scripts/osm-import/weekly-update.sh), which is exactly what a cascading FK
  // does — except the FK also stops a batch row from being removed while its
  // addresses remain.
  pgm.sql(`
    DELETE FROM geodata.addresses a
    WHERE NOT EXISTS (
      SELECT 1 FROM geodata.import_batches b WHERE b.external_id = a.import_batch_id
    );
  `);
  pgm.sql(`
    ALTER TABLE geodata.addresses
      ADD CONSTRAINT fk_addresses_import_batch
      FOREIGN KEY (import_batch_id) REFERENCES geodata.import_batches(external_id)
      ON DELETE CASCADE;
  `);

  for (const { schema, name } of [
    ...DUPLICATE_INDEXES,
    ...DEAD_INDEXES,
    ...REDUNDANT_PREFIX_INDEXES,
  ]) {
    pgm.sql(`DROP INDEX IF EXISTS ${schema}.${name};`);
  }

  for (const table of SUB_RESOURCE_TABLES) {
    pgm.sql(`
      ALTER TABLE ${table}
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT current_timestamp;
      CREATE TRIGGER ${triggerName(table)}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const table of [...SUB_RESOURCE_TABLES].reverse()) {
    pgm.sql(`
      DROP TRIGGER IF EXISTS ${triggerName(table)} ON ${table};
      ALTER TABLE ${table} DROP COLUMN IF EXISTS updated_at;
    `);
  }

  for (const { recreate } of [...REDUNDANT_PREFIX_INDEXES, ...DEAD_INDEXES, ...DUPLICATE_INDEXES]) {
    pgm.sql(`${recreate};`);
  }

  pgm.sql(`
    ALTER TABLE geodata.addresses DROP CONSTRAINT IF EXISTS fk_addresses_import_batch;
  `);
  pgm.sql(`ALTER TABLE encounters.encounters ALTER COLUMN location_address_id TYPE integer;`);
}
