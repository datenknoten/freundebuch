import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * OAuth 2.1 provider tables for the Better Auth `mcp` plugin.
 *
 * These back the OAuth authorization server that lets remote MCP clients
 * (e.g. claude.ai) connect to the Freundebuch MCP server via the MCP
 * Authorization spec (OAuth + PKCE + Dynamic Client Registration).
 *
 * The plugin's default model/field names are camelCase (`oauthApplication`,
 * `clientId`, ...). We create snake_case tables/columns to match this repo's
 * conventions and map them back via the plugin `schema` overrides in
 * `apps/backend/src/lib/auth.ts`. Access/refresh tokens are stored hashed by
 * Better Auth — no plaintext secrets at rest.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Registered OAuth clients. With Dynamic Client Registration enabled, one row
  // is created per client that registers (claude.ai registers itself).
  pgm.createTable(
    { schema: 'auth', name: 'oauth_application' },
    {
      id: { type: 'text', primaryKey: true },
      name: { type: 'text', notNull: true },
      icon: { type: 'text' },
      metadata: { type: 'text' },
      client_id: { type: 'text', notNull: true, unique: true },
      client_secret: { type: 'text' },
      redirect_urls: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true },
      disabled: { type: 'boolean', notNull: true, default: false },
      user_id: {
        type: 'text',
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
        comment: 'Owner of the client registration (nullable for anonymous DCR)',
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

  pgm.createIndex({ schema: 'auth', name: 'oauth_application' }, 'user_id', {
    name: 'idx_oauth_application_user_id',
  });

  // Issued access/refresh tokens. Bearer tokens presented to /mcp are validated
  // against this table by the mcp-server (getMcpSession). Nullable refresh
  // fields tolerate grants that do not issue a refresh token.
  pgm.createTable(
    { schema: 'auth', name: 'oauth_access_token' },
    {
      id: { type: 'text', primaryKey: true },
      access_token: { type: 'text', notNull: true, unique: true },
      refresh_token: { type: 'text', unique: true },
      access_token_expires_at: { type: 'timestamptz' },
      refresh_token_expires_at: { type: 'timestamptz' },
      // client_id references oauth_application.client_id (a unique, non-PK
      // column). Better Auth enforces this relationship in application code;
      // we keep it as an indexed column without a DB-level FK to avoid
      // constraining against a non-primary key.
      client_id: { type: 'text', notNull: true },
      user_id: {
        type: 'text',
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
      },
      scopes: { type: 'text' },
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

  pgm.createIndex({ schema: 'auth', name: 'oauth_access_token' }, 'client_id', {
    name: 'idx_oauth_access_token_client_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'oauth_access_token' }, 'user_id', {
    name: 'idx_oauth_access_token_user_id',
  });

  // Per-user, per-client consent records so a user is not re-prompted every time.
  pgm.createTable(
    { schema: 'auth', name: 'oauth_consent' },
    {
      id: { type: 'text', primaryKey: true },
      // See note on oauth_access_token.client_id — indexed, no DB-level FK.
      client_id: { type: 'text', notNull: true },
      user_id: {
        type: 'text',
        notNull: true,
        references: { schema: 'auth', name: 'user' },
        onDelete: 'CASCADE',
      },
      scopes: { type: 'text' },
      consent_given: { type: 'boolean', notNull: true, default: false },
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

  pgm.createIndex({ schema: 'auth', name: 'oauth_consent' }, 'client_id', {
    name: 'idx_oauth_consent_client_id',
  });
  pgm.createIndex({ schema: 'auth', name: 'oauth_consent' }, 'user_id', {
    name: 'idx_oauth_consent_user_id',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'auth', name: 'oauth_consent' }, { ifExists: true });
  pgm.dropTable({ schema: 'auth', name: 'oauth_access_token' }, { ifExists: true });
  pgm.dropTable({ schema: 'auth', name: 'oauth_application' }, { ifExists: true });
}
