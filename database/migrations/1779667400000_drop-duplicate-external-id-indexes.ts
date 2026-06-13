import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Every table has a UNIQUE constraint on external_id (which creates its own
 * index) plus a redundant explicit idx_<table>_external_id on the same column.
 * The duplicate is pure write/storage overhead. Drop the explicit ones; the
 * unique-constraint index still serves all external_id lookups.
 *
 * down() recreates the explicit indexes.
 */
const TABLES: Array<[schema: string, table: string]> = [
  ['auth', 'app_passwords'],
  ['auth', 'password_reset_tokens'],
  ['auth', 'sessions'],
  ['auth', 'users'],
  ['collectives', 'collective_addresses'],
  ['collectives', 'collective_emails'],
  ['collectives', 'collective_memberships'],
  ['collectives', 'collective_phones'],
  ['collectives', 'collective_roles'],
  ['collectives', 'collective_types'],
  ['collectives', 'collective_urls'],
  ['collectives', 'collectives'],
  ['encounters', 'encounter_friends'],
  ['encounters', 'encounters'],
  ['friends', 'circles'],
  ['friends', 'friend_addresses'],
  ['friends', 'friend_dates'],
  ['friends', 'friend_emails'],
  ['friends', 'friend_met_info'],
  ['friends', 'friend_phones'],
  ['friends', 'friend_professional_history'],
  ['friends', 'friend_relationships'],
  ['friends', 'friend_social_profiles'],
  ['friends', 'friend_urls'],
  ['friends', 'friends'],
  ['system', 'address_cache'],
  ['system', 'notification_channels'],
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [schema, table] of TABLES) {
    pgm.sql(`DROP INDEX IF EXISTS "${schema}"."idx_${table}_external_id";`);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const [schema, table] of TABLES) {
    pgm.sql(
      `CREATE INDEX IF NOT EXISTS "idx_${table}_external_id" ON "${schema}"."${table}" (external_id);`,
    );
  }
}
