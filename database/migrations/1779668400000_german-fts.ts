import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Switch the friend full-text search from the `english` to the `german`
 * dictionary and make phone search index-backed.
 *
 * The product is DACH-focused, but the search vector and every search query
 * used English stemming and stopwords, so German queries missed ("Bücher" did
 * not match "Buch") and the unindexed `ILIKE` fallback papered over it.
 *
 * Also adds a trigram index on `display_name` (used by the `ILIKE` prefix
 * fallback) and a stored `phone_digits` column so digit-only phone search can
 * use a trigram index instead of a per-row `regexp_replace`.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Same body as 1768800000000_friend-professional-history.ts, with 'german'
  // instead of 'english' in every to_tsvector call.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.update_friend_search_vector()
    RETURNS TRIGGER AS $$
    DECLARE
      primary_job_title TEXT;
      primary_organization TEXT;
      primary_department TEXT;
      primary_notes TEXT;
    BEGIN
      -- Get primary professional info from the new table
      SELECT
        ph.job_title,
        ph.organization,
        ph.department,
        ph.notes
      INTO
        primary_job_title,
        primary_organization,
        primary_department,
        primary_notes
      FROM friends.friend_professional_history ph
      WHERE ph.friend_id = NEW.id AND ph.is_primary = true
      LIMIT 1;

      NEW.search_vector :=
        setweight(to_tsvector('german', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.nickname, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.name_first, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.name_last, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.name_middle, '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(primary_organization, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(primary_job_title, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(primary_department, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(primary_notes, '')), 'C') ||
        setweight(to_tsvector('german', COALESCE(NEW.interests, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Rebuild every stored vector by firing the BEFORE UPDATE trigger.
  pgm.sql(`UPDATE friends.friends SET updated_at = updated_at;`);

  // Backs the display_name ILIKE prefix fallback in search.sql.
  pgm.sql(`
    CREATE INDEX idx_friends_display_name_trgm
      ON friends.friends USING gin (display_name gin_trgm_ops);
  `);

  // Stored digits so phone search is a plain LIKE against an indexed column
  // instead of regexp_replace over every row.
  pgm.sql(`
    ALTER TABLE friends.friend_phones
      ADD COLUMN phone_digits text
      GENERATED ALWAYS AS (regexp_replace(phone_number, '[^0-9]', '', 'g')) STORED;
  `);
  pgm.sql(`
    CREATE INDEX idx_friend_phones_digits_trgm
      ON friends.friend_phones USING gin (phone_digits gin_trgm_ops);
  `);

  // Superseded: it indexed the formatted phone_number for the old ILIKE search,
  // which now matches on phone_digits.
  pgm.sql(`DROP INDEX IF EXISTS friends.idx_friend_phones_trgm;`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS friends.idx_friend_phones_digits_trgm;`);
  pgm.sql(`ALTER TABLE friends.friend_phones DROP COLUMN IF EXISTS phone_digits;`);
  pgm.sql(`
    CREATE INDEX idx_friend_phones_trgm
      ON friends.friend_phones USING gin (phone_number gin_trgm_ops);
  `);
  pgm.sql(`DROP INDEX IF EXISTS friends.idx_friends_display_name_trgm;`);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION friends.update_friend_search_vector()
    RETURNS TRIGGER AS $$
    DECLARE
      primary_job_title TEXT;
      primary_organization TEXT;
      primary_department TEXT;
      primary_notes TEXT;
    BEGIN
      -- Get primary professional info from the new table
      SELECT
        ph.job_title,
        ph.organization,
        ph.department,
        ph.notes
      INTO
        primary_job_title,
        primary_organization,
        primary_department,
        primary_notes
      FROM friends.friend_professional_history ph
      WHERE ph.friend_id = NEW.id AND ph.is_primary = true
      LIMIT 1;

      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.nickname, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_first, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_last, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_middle, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(primary_organization, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(primary_job_title, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(primary_department, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(primary_notes, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.interests, '')), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`UPDATE friends.friends SET updated_at = updated_at;`);
}
