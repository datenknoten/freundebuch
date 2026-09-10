import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * One identity per user: `auth."user".id = auth.users.external_id::text`.
 *
 * The Better Auth migration was never finished. It left two user tables — the
 * legacy `auth.users` (SERIAL `id`, UUID `external_id`, email, password hash)
 * and Better Auth's `auth."user"` (TEXT `id`) — with no relation between them
 * except the email address, which every authenticated request had to join on.
 * That made the address load-bearing for identity: changing it desynchronised
 * the tables and locked the account out.
 *
 * `auth.users` stays as the integer FK anchor for the eleven domain tables
 * (rewriting those to TEXT would mean eleven FK rewrites plus index bloat,
 * against six BA child FKs re-keyed here through ON UPDATE CASCADE). All
 * identity data — email, credentials, `self_profile_id`, `preferences` — lives
 * only on `auth."user"` afterwards.
 *
 * Accounts created after the BA migration have a non-UUID BA id, so the ids are
 * re-keyed to the legacy UUID rather than the other way round. If production
 * has no such accounts the UPDATE is a no-op.
 */

/** Better Auth child tables whose FK must follow a re-keyed user id. */
const BA_CHILD_FKS = [
  { table: 'auth.session', constraint: 'session_user_id_fkey' },
  { table: 'auth.account', constraint: 'account_user_id_fkey' },
  { table: 'auth.passkey', constraint: 'passkey_user_id_fkey' },
  { table: 'auth.oauth_application', constraint: 'oauth_application_user_id_fkey' },
  { table: 'auth.oauth_access_token', constraint: 'oauth_access_token_user_id_fkey' },
  { table: 'auth.oauth_consent', constraint: 'oauth_consent_user_id_fkey' },
] as const;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Let a re-keyed auth."user".id propagate to the BA children.
  for (const { table, constraint } of BA_CHILD_FKS) {
    pgm.sql(`
      ALTER TABLE ${table} DROP CONSTRAINT ${constraint};
      ALTER TABLE ${table} ADD CONSTRAINT ${constraint}
        FOREIGN KEY (user_id) REFERENCES auth."user"(id)
        ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  }

  // 2a. Credential accounts mirror the user id in account_id. Better Auth only
  //     reads it for OAuth providers, so keeping it in sync is cosmetic, but a
  //     stale value is a dangling reference. Must run before the re-key below,
  //     while account_id still matches the old auth."user".id.
  pgm.sql(`
    UPDATE auth.account a
    SET account_id = lu.external_id::text
    FROM auth."user" bu
    JOIN auth.users lu ON lu.email = bu.email
    WHERE a.user_id = bu.id
      AND a.provider_id = 'credential'
      AND a.account_id = bu.id
      AND bu.id <> lu.external_id::text;
  `);

  // 2b. auth.verification.value holds the user id for `reset-password:` and
  //     e-mail-change tokens, with no FK, so the re-key below does not reach
  //     it. Without this a token issued before the upgrade stops resolving and
  //     the user's reset link silently fails.
  pgm.sql(`
    UPDATE auth.verification v
    SET value = lu.external_id::text
    FROM auth."user" bu
    JOIN auth.users lu ON lu.email = bu.email
    WHERE v.value = bu.id
      AND bu.id <> lu.external_id::text;
  `);

  // 2. Re-key the Better Auth rows whose id diverged from the legacy UUID.
  pgm.sql(`
    UPDATE auth."user" bu
    SET id = lu.external_id::text
    FROM auth.users lu
    WHERE lu.email = bu.email
      AND bu.id <> lu.external_id::text;
  `);

  // 3. Refuse to continue on rows that cannot be paired: silently dropping or
  //    inventing an identity would orphan a user's friends.
  pgm.sql(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM auth."user" bu
        WHERE NOT EXISTS (SELECT 1 FROM auth.users lu WHERE lu.external_id::text = bu.id)
      ) OR EXISTS (
        SELECT 1 FROM auth.users lu
        WHERE NOT EXISTS (SELECT 1 FROM auth."user" bu WHERE bu.id = lu.external_id::text)
      )
      THEN RAISE EXCEPTION 'orphan identity rows; resolve manually before upgrading';
      END IF;
    END $$;
  `);

  // 4. Preferences move to the Better Auth row for good.
  pgm.sql(`
    UPDATE auth."user" bu
    SET preferences = lu.preferences
    FROM auth.users lu
    WHERE lu.external_id::text = bu.id
      AND (bu.preferences IS NULL OR bu.preferences = '{}'::jsonb)
      AND lu.preferences <> '{}'::jsonb;
  `);
  pgm.sql(`
    UPDATE auth."user" SET preferences = '{}'::jsonb WHERE preferences IS NULL;
    ALTER TABLE auth."user"
      ALTER COLUMN preferences SET DEFAULT '{}'::jsonb,
      ALTER COLUMN preferences SET NOT NULL;
  `);

  // 5. Same for the self-profile pointer.
  pgm.sql(`
    UPDATE auth."user" bu
    SET self_profile_id = lu.self_profile_id
    FROM auth.users lu
    WHERE lu.external_id::text = bu.id
      AND bu.self_profile_id IS NULL
      AND lu.self_profile_id IS NOT NULL;
  `);

  // 6. Drop the duplicated identity data. The email/self_profile indexes go
  //    with their columns.
  pgm.sql(`
    ALTER TABLE auth.users DROP CONSTRAINT users_email_lowercase;
    ALTER TABLE auth.users
      DROP COLUMN email,
      DROP COLUMN password_hash,
      DROP COLUMN preferences,
      DROP COLUMN self_profile_id;
  `);

  // 7. The pre-Better-Auth session and reset-token tables have had no writer
  //    since the migration; only the cleanup cron still touched them.
  pgm.sql(`
    DROP TABLE auth.sessions;
    DROP TABLE auth.password_reset_tokens;
  `);

  // 8. auth."user".updated_at was only maintained by Better Auth itself; the
  //    trigger covers direct updates (preferences, self-profile) too.
  pgm.sql(`
    CREATE TRIGGER update_ba_user_updated_at
      BEFORE UPDATE ON auth."user"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // 9. The legacy row is allocated before the Better Auth user exists, so a
  //    failed sign-up can leave one behind. Reaped by the hourly cleanup.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION auth.delete_orphan_legacy_users() RETURNS integer AS $$
    DECLARE
      deleted integer;
    BEGIN
      DELETE FROM auth.users lu
      WHERE NOT EXISTS (SELECT 1 FROM auth."user" bu WHERE bu.id = lu.external_id::text)
        AND lu.created_at < now() - interval '1 day';
      GET DIAGNOSTICS deleted = ROW_COUNT;
      RETURN deleted;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION auth.delete_orphan_legacy_users() IS
      'Removes auth.users rows with no Better Auth counterpart older than a day (failed sign-ups)';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP FUNCTION IF EXISTS auth.delete_orphan_legacy_users();`);
  pgm.sql(`DROP TRIGGER IF EXISTS update_ba_user_updated_at ON auth."user";`);

  pgm.sql(`
    CREATE TABLE auth.sessions (
      id serial PRIMARY KEY,
      external_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
      user_id integer NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_sessions_user_id ON auth.sessions (user_id);
    CREATE INDEX idx_sessions_token_hash ON auth.sessions (token_hash);
    CREATE INDEX idx_sessions_expires_at ON auth.sessions (expires_at);

    CREATE TABLE auth.password_reset_tokens (
      id serial PRIMARY KEY,
      external_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
      user_id integer NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_password_reset_tokens_user_id ON auth.password_reset_tokens (user_id);
    CREATE INDEX idx_password_reset_tokens_token_hash ON auth.password_reset_tokens (token_hash);
    CREATE INDEX idx_password_reset_tokens_expires_at ON auth.password_reset_tokens (expires_at);
  `);
  pgm.sql(`
    ALTER TABLE auth.users
      ADD COLUMN email text,
      ADD COLUMN password_hash text NOT NULL DEFAULT '',
      ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN self_profile_id integer,
      ADD CONSTRAINT users_self_contact_id_fkey
        FOREIGN KEY (self_profile_id) REFERENCES friends.friends(id) ON DELETE SET NULL;
  `);
  pgm.sql(`
    UPDATE auth.users lu
    SET email = bu.email,
        preferences = COALESCE(bu.preferences, '{}'::jsonb),
        self_profile_id = bu.self_profile_id
    FROM auth."user" bu
    WHERE bu.id = lu.external_id::text;
  `);
  pgm.sql(`
    ALTER TABLE auth.users ALTER COLUMN email SET NOT NULL;
    ALTER TABLE auth.users ADD CONSTRAINT users_email_key UNIQUE (email);
    ALTER TABLE auth.users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));
    CREATE INDEX idx_users_email ON auth.users (email);
    CREATE INDEX idx_users_self_profile_id ON auth.users (self_profile_id);
  `);

  pgm.sql(`ALTER TABLE auth."user" ALTER COLUMN preferences DROP NOT NULL;`);
}
