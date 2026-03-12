import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Epic 18: Better Auth Migration
 *
 * Better Auth uses singular table names (user, session, account, verification)
 * while our existing tables use plural names (users, sessions, password_reset_tokens).
 * This allows both systems to coexist in the same `auth` schema during transition.
 *
 * This migration:
 * 1. Creates Better Auth core tables alongside existing ones
 * 2. Migrates existing user data to Better Auth tables
 * 3. Keeps legacy tables intact for FK compatibility (other schemas reference auth.users)
 *
 * After a verification period, a follow-up migration will:
 * - Drop legacy tables (users, sessions, password_reset_tokens)
 * - Update FK references in other schemas
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Better Auth "user" table with custom fields
  pgm.createTable(
    { schema: 'auth', name: 'user' },
    {
      id: {
        type: 'text',
        primaryKey: true,
        comment: 'UUID primary key (mapped from legacy external_id)',
      },
      name: {
        type: 'text',
        notNull: true,
      },
      email: {
        type: 'text',
        notNull: true,
        unique: true,
      },
      email_verified: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
      image: {
        type: 'text',
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
      // Custom fields for Freundebuch
      self_profile_id: {
        type: 'integer',
        references: { schema: 'friends', name: 'friends' },
        onDelete: 'SET NULL',
        comment: 'FK to friends.friends - set during onboarding',
      },
      preferences: {
        type: 'jsonb',
        default: pgm.func("'{}'::jsonb"),
        comment: 'User preferences (page size, birthday format, language, etc.)',
      },
    },
  );

  pgm.createIndex({ schema: 'auth', name: 'user' }, 'email', {
    name: 'idx_ba_user_email',
  });

  // Better Auth "session" table
  pgm.createTable(
    { schema: 'auth', name: 'session' },
    {
      id: {
        type: 'text',
        primaryKey: true,
      },
      expires_at: {
        type: 'timestamptz',
        notNull: true,
      },
      token: {
        type: 'text',
        notNull: true,
        unique: true,
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
      ip_address: {
        type: 'text',
      },
      user_agent: {
        type: 'text',
      },
      user_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
      },
    },
  );

  pgm.createIndex({ schema: 'auth', name: 'session' }, 'token', {
    name: 'idx_ba_session_token',
  });
  pgm.createIndex({ schema: 'auth', name: 'session' }, 'user_id', {
    name: 'idx_ba_session_user_id',
  });

  // Better Auth "account" table (stores credentials and OAuth accounts)
  pgm.createTable(
    { schema: 'auth', name: 'account' },
    {
      id: {
        type: 'text',
        primaryKey: true,
      },
      account_id: {
        type: 'text',
        notNull: true,
      },
      provider_id: {
        type: 'text',
        notNull: true,
      },
      user_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
      },
      access_token: {
        type: 'text',
      },
      refresh_token: {
        type: 'text',
      },
      id_token: {
        type: 'text',
      },
      access_token_expires_at: {
        type: 'timestamptz',
      },
      refresh_token_expires_at: {
        type: 'timestamptz',
      },
      scope: {
        type: 'text',
      },
      password: {
        type: 'text',
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

  pgm.createIndex({ schema: 'auth', name: 'account' }, 'user_id', {
    name: 'idx_ba_account_user_id',
  });

  // Better Auth "verification" table (password reset, email verification, etc.)
  pgm.createTable(
    { schema: 'auth', name: 'verification' },
    {
      id: {
        type: 'text',
        primaryKey: true,
      },
      identifier: {
        type: 'text',
        notNull: true,
      },
      value: {
        type: 'text',
        notNull: true,
      },
      expires_at: {
        type: 'timestamptz',
        notNull: true,
      },
      created_at: {
        type: 'timestamptz',
        default: pgm.func('current_timestamp'),
      },
      updated_at: {
        type: 'timestamptz',
        default: pgm.func('current_timestamp'),
      },
    },
  );

  // Migrate existing users to Better Auth user table
  pgm.sql(`
    INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at, self_profile_id, preferences)
    SELECT
      external_id::text,
      split_part(email, '@', 1),
      email,
      false,
      created_at,
      updated_at,
      self_profile_id,
      COALESCE(preferences, '{}'::jsonb)
    FROM auth.users
  `);

  // Create credential account entries with existing bcrypt password hashes
  pgm.sql(`
    INSERT INTO auth.account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      external_id::text,
      'credential',
      external_id::text,
      password_hash,
      created_at,
      updated_at
    FROM auth.users
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'auth', name: 'verification' }, { ifExists: true });
  pgm.dropTable({ schema: 'auth', name: 'account' }, { ifExists: true });
  pgm.dropTable({ schema: 'auth', name: 'session' }, { ifExists: true });
  pgm.dropTable({ schema: 'auth', name: 'user' }, { ifExists: true, cascade: true });
}
