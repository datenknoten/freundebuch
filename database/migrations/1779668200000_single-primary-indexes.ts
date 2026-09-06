import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * At most one primary sub-resource per owner, enforced by the schema.
 *
 * The rule lived only in `SubResourceService`, which clears the flag before
 * setting it. SabreDAV writes the same tables directly from vCard PUTs and
 * never had that logic, so a synced card with two `TYPE=pref` entries produced
 * two primaries — and the read paths pick "the" primary with `LIMIT 1`, so
 * which one won depended on physical row order.
 *
 * A partial unique index binds all three consumers. The TS clear-then-set path
 * runs inside one transaction, so it never sees the intermediate state.
 */
const OWNED_TABLES = [
  { table: 'friends.friend_phones', owner: 'friend_id', index: 'idx_friend_phones_single_primary' },
  { table: 'friends.friend_emails', owner: 'friend_id', index: 'idx_friend_emails_single_primary' },
  {
    table: 'friends.friend_addresses',
    owner: 'friend_id',
    index: 'idx_friend_addresses_single_primary',
  },
  {
    table: 'friends.friend_professional_history',
    owner: 'friend_id',
    index: 'idx_friend_professional_history_single_primary',
  },
  {
    table: 'collectives.collective_phones',
    owner: 'collective_id',
    index: 'idx_collective_phones_single_primary',
  },
  {
    table: 'collectives.collective_emails',
    owner: 'collective_id',
    index: 'idx_collective_emails_single_primary',
  },
  {
    table: 'collectives.collective_addresses',
    owner: 'collective_id',
    index: 'idx_collective_addresses_single_primary',
  },
] as const;

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const { table, owner, index } of OWNED_TABLES) {
    // Normalise first: keep the lowest id per owner, which is the oldest row
    // and therefore the one a user most likely set deliberately.
    pgm.sql(`
      UPDATE ${table}
      SET is_primary = false
      WHERE is_primary
        AND id NOT IN (
          SELECT min(id) FROM ${table} WHERE is_primary GROUP BY ${owner}
        );
    `);
    pgm.sql(`
      CREATE UNIQUE INDEX ${index} ON ${table} (${owner}) WHERE is_primary;
    `);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const { table, index } of OWNED_TABLES) {
    // The index lives in the table's schema, so it must be dropped qualified.
    const schema = table.split('.')[0];
    pgm.sql(`DROP INDEX IF EXISTS ${schema}.${index};`);
  }
}
