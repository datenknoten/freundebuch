import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Add passkey (WebAuthn) support via Better Auth passkey plugin.
 *
 * Creates the `passkey` table in the `auth` schema to store
 * registered WebAuthn credentials (hardware keys, platform authenticators).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    { schema: 'auth', name: 'passkey' },
    {
      id: {
        type: 'text',
        primaryKey: true,
      },
      name: {
        type: 'text',
        comment: 'User-chosen label for this passkey',
      },
      public_key: {
        type: 'text',
        notNull: true,
      },
      user_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
      },
      credential_id: {
        type: 'text',
        notNull: true,
        unique: true,
      },
      counter: {
        type: 'integer',
        notNull: true,
        default: 0,
      },
      device_type: {
        type: 'text',
        comment: '"singleDevice" or "multiDevice"',
      },
      backed_up: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
      transports: {
        type: 'text',
        comment: 'Comma-separated list of transports',
      },
      created_at: {
        type: 'timestamptz',
        default: pgm.func('current_timestamp'),
      },
      aaguid: {
        type: 'text',
        comment: 'Authenticator attestation GUID',
      },
    },
  );

  pgm.createIndex({ schema: 'auth', name: 'passkey' }, 'credential_id', {
    name: 'idx_ba_passkey_credential_id',
    unique: true,
  });
  pgm.createIndex({ schema: 'auth', name: 'passkey' }, 'user_id', {
    name: 'idx_ba_passkey_user_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'auth', name: 'passkey' }, { ifExists: true });
}
