import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Emails must be stored lowercase on both identity tables.
 *
 * Better Auth lowercases on sign-up, but the legacy `auth.users` table and the
 * PHP/MCP lookups compared raw strings, so a mixed-case address inserted before
 * the Better Auth migration silently failed to match. A CHECK constraint makes
 * the invariant unbypassable for every consumer (backend, SabreDAV, MCP).
 *
 * Case collisions are *not* merged automatically: two rows differing only in
 * case are two accounts with two sets of friends. The migration aborts and
 * leaves the resolution to the operator.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$ BEGIN
      IF EXISTS (SELECT lower(email) FROM auth."user" GROUP BY lower(email) HAVING count(*) > 1)
      OR EXISTS (SELECT lower(email) FROM auth.users GROUP BY lower(email) HAVING count(*) > 1)
      THEN RAISE EXCEPTION 'case-colliding emails exist; resolve manually';
      END IF;
    END $$;
  `);

  pgm.sql(`UPDATE auth."user" SET email = lower(email) WHERE email <> lower(email);`);
  pgm.sql(`UPDATE auth.users SET email = lower(email) WHERE email <> lower(email);`);

  pgm.sql(`
    ALTER TABLE auth."user" ADD CONSTRAINT user_email_lowercase CHECK (email = lower(email));
  `);
  pgm.sql(`
    ALTER TABLE auth.users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE auth."user" DROP CONSTRAINT IF EXISTS user_email_lowercase;`);
  pgm.sql(`ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_email_lowercase;`);
}
