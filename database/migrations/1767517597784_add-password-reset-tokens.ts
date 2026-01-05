import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create password_reset_tokens table
  pgm.createTable(
    { schema: 'auth', name: 'password_reset_tokens' },
    {
      id: {
        type: 'serial',
        primaryKey: true,
        comment: 'Internal sequential ID',
      },
      external_id: {
        type: 'uuid',
        notNull: true,
        unique: true,
        default: pgm.func('gen_random_uuid()'),
        comment: 'Public UUID for API exposure',
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
        comment: 'SHA-256 hash of reset token (tokens are never stored in plaintext)',
      },
      expires_at: {
        type: 'timestamptz',
        notNull: true,
        comment: 'Token expiration time (typically 1 hour)',
      },
      used_at: {
        type: 'timestamptz',
        comment: 'When the token was used (null if unused)',
      },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    },
  );

  // Add table comment
  pgm.sql(
    `COMMENT ON TABLE auth.password_reset_tokens IS 'Password reset tokens for forgot password flow'`,
  );

  // Create indexes
  pgm.createIndex({ schema: 'auth', name: 'password_reset_tokens' }, 'external_id', {
    name: 'idx_password_reset_tokens_external_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'password_reset_tokens' }, 'user_id', {
    name: 'idx_password_reset_tokens_user_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'password_reset_tokens' }, 'token_hash', {
    name: 'idx_password_reset_tokens_token_hash',
  });
  pgm.createIndex({ schema: 'auth', name: 'password_reset_tokens' }, 'expires_at', {
    name: 'idx_password_reset_tokens_expires_at',
  });
};

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'auth', name: 'password_reset_tokens' }, { cascade: true });
};
