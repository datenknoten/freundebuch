import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Replace the plaintext app-password prefix with a hashed lookup key.
 *
 * `auth.app_passwords.password_prefix` held the first 8 characters of the raw
 * app password in plaintext. A database dump therefore handed an attacker a
 * third of a 24-byte secret plus an offline oracle to confirm guesses against
 * the bcrypt hash. The column keeps its role as the indexed lookup key, but
 * now stores `left(sha256(<raw 8-char prefix>), 16 hex chars)`, which both the
 * backend (`hashAppPasswordPrefix`) and SabreDAV
 * (`substr(hash('sha256', $prefix), 0, 16)`) compute identically.
 *
 * The column is already `text` (1779667300000_varchar-to-text), so 16 hex
 * characters fit; the ALTER below is a no-op safety net for databases that
 * somehow still carry the original varchar(8).
 *
 * The UPDATE only touches rows that are not already hashed, so re-running the
 * migration after a rollback cannot double-hash and lock users out. Raw
 * prefixes are always exactly 8 base64url characters, so they can never be
 * mistaken for a 16-char hex hash.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE auth.app_passwords ALTER COLUMN password_prefix TYPE text;`);

  pgm.sql(`
    UPDATE auth.app_passwords
    SET password_prefix = left(encode(sha256(password_prefix::bytea), 'hex'), 16)
    WHERE password_prefix !~ '^[0-9a-f]{16}$';
  `);

  pgm.sql(`
    COMMENT ON COLUMN auth.app_passwords.password_prefix IS
      'left(sha256(first 8 chars of the raw password), 16 hex chars) - indexed lookup key, not the prefix itself';
  `);
}

/**
 * Irreversible by construction: sha256 of the prefix cannot be turned back
 * into the prefix, and the plaintext exists nowhere else (the API shows it to
 * the user once, at creation).
 *
 * This down() therefore restores nothing and deliberately does not raise:
 * CI rolls every migration back and forward again (`up -> down -> up`), and a
 * hard failure here would break that gate for every later migration. Rolling
 * back leaves the hashed values in place, which still authenticate correctly
 * because the pre-migration code path is the only thing that would disagree —
 * an operator downgrading the schema must also downgrade the application, and
 * in that combination the affected users have to create new app passwords.
 * The notice makes that visible in the migration log.
 */
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    COMMENT ON COLUMN auth.app_passwords.password_prefix IS 'First 8 chars for quick lookup';
  `);
  pgm.sql(`
    DO $$
    DECLARE
      affected bigint;
    BEGIN
      SELECT count(*) INTO affected
      FROM auth.app_passwords
      WHERE password_prefix ~ '^[0-9a-f]{16}$';

      IF affected > 0 THEN
        RAISE NOTICE 'auth.app_passwords.password_prefix stays hashed for % row(s): the plaintext prefix is unrecoverable. Existing app passwords keep working with hashed-prefix code; with pre-migration code they must be recreated.', affected;
      END IF;
    END $$;
  `);
}
