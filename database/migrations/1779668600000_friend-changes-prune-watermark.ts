import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Track how far the CardDAV sync log has been pruned, per user.
 *
 * `friends.friend_changes` is the tombstone log behind CardDAV sync: a client
 * presents `sync-<id>` and gets everything with a higher id, deletions
 * included. The 90-day retention sweep therefore destroys information a client
 * may still need, and RFC 6578 (and SabreDAV's `SyncSupport` docblock, which
 * names "data cleanup" explicitly) requires the server to answer such a token
 * with a full resync rather than a partial answer.
 *
 * Without a record of what was pruned there is no way to tell an old-but-valid
 * token from one whose changes are gone, so the sweep stores the highest id it
 * removed per user. Two invariants depend on it:
 *
 *   - a token at or below the watermark is expired -> full resync
 *   - the advertised sync token never regresses, even when a user's last log
 *     row is swept away (`MAX(id)` would fall back to 0 and re-advertise
 *     `sync-0`, which clients treat as "never synced")
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    { schema: 'friends', name: 'friend_changes_pruned' },
    {
      user_id: {
        type: 'integer',
        primaryKey: true,
        // The identity anchor: dropping the user drops their watermark with
        // the rest of their data.
        references: 'auth.users(id)',
        onDelete: 'CASCADE',
      },
      pruned_through_id: {
        type: 'bigint',
        notNull: true,
        comment: 'Highest friend_changes.id removed by the retention sweep for this user',
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    {
      comment:
        'Retention watermark for the CardDAV sync log: a sync token at or below pruned_through_id is expired and must trigger a full resync',
    },
  );

  pgm.sql(`
    CREATE TRIGGER update_friend_changes_pruned_updated_at
      BEFORE UPDATE ON friends.friend_changes_pruned
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(
    'DROP TRIGGER IF EXISTS update_friend_changes_pruned_updated_at ON friends.friend_changes_pruned',
  );
  pgm.dropTable({ schema: 'friends', name: 'friend_changes_pruned' });
}
