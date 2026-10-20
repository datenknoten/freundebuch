import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder) {
  pgm.createSchema('auth', { ifNotExists: true });

  pgm.sql(`COMMENT ON SCHEMA auth IS 'Authentication and user management'`);

  pgm.createTable(
    { schema: 'auth', name: 'users' },
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
      email: {
        type: 'text',
        notNull: true,
        unique: true,
      },
      password_hash: {
        type: 'text',
        notNull: true,
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

  pgm.sql(`COMMENT ON TABLE auth.users IS 'User accounts with authentication credentials'`);

  pgm.createIndex({ schema: 'auth', name: 'users' }, 'external_id', {
    name: 'idx_users_external_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'users' }, 'email', { name: 'idx_users_email' });

  pgm.createTable(
    { schema: 'auth', name: 'sessions' },
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
      user_id: {
        type: 'integer',
        notNull: true,
        references: { schema: 'auth', name: 'users' },
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: 'text',
        notNull: true,
        unique: true,
        comment: 'SHA-256 hash of session token (tokens are never stored in plaintext)',
      },
      expires_at: {
        type: 'timestamptz',
        notNull: true,
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  pgm.sql(`COMMENT ON TABLE auth.sessions IS 'User authentication sessions'`);

  pgm.createIndex({ schema: 'auth', name: 'sessions' }, 'external_id', {
    name: 'idx_sessions_external_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'sessions' }, 'user_id', {
    name: 'idx_sessions_user_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'sessions' }, 'token_hash', {
    name: 'idx_sessions_token_hash',
  });
  pgm.createIndex({ schema: 'auth', name: 'sessions' }, 'expires_at', {
    name: 'idx_sessions_expires_at',
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder) {
  // Drop tables in reverse order (sessions before users due to foreign key)
  pgm.dropTable({ schema: 'auth', name: 'sessions' }, { cascade: true });
  pgm.dropTable({ schema: 'auth', name: 'users' }, { cascade: true });

  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;');

  pgm.dropSchema('auth', { cascade: true });
}
