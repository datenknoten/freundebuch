import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Add timestamped free-text notes about a friend (Epic 15).
 *
 * A note can link to the encounter where the user learned it
 * (`encounter_id`), to the friend who told it (`source_friend_id`), and to an
 * older note of the same friend that it replaces (`supersedes_note_id`).
 *
 * Notes are not part of the vCard. For that reason the table has no
 * `friends.log_subresource_change()` trigger: editing a note must not change
 * the CardDAV ETag of the friend or show up in an incremental sync.
 *
 * For the same reason, search uses a stored generated `search_vector` on the
 * note itself and does not touch `friends.search_vector`, which the friend
 * search trigger maintains and which is part of the friend row.
 *
 * The rules "supersede only a note of the same friend" and "the encounter and
 * the source friend belong to the same user" live in the service, not here.
 * `encounter_id` uses ON DELETE SET NULL because user cleanup deletes
 * encounters before friends.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE friends.friend_notes (
      id SERIAL PRIMARY KEY,
      external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      friend_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      encounter_id INTEGER,
      source_friend_id INTEGER,
      supersedes_note_id INTEGER,
      search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('german'::regconfig, content)) STORED,
      created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
      CONSTRAINT fk_friend_notes_friend_id FOREIGN KEY (friend_id)
        REFERENCES friends.friends(id) ON DELETE CASCADE,
      CONSTRAINT fk_friend_notes_encounter_id FOREIGN KEY (encounter_id)
        REFERENCES encounters.encounters(id) ON DELETE SET NULL,
      CONSTRAINT fk_friend_notes_source_friend_id FOREIGN KEY (source_friend_id)
        REFERENCES friends.friends(id) ON DELETE SET NULL,
      CONSTRAINT fk_friend_notes_supersedes_note_id FOREIGN KEY (supersedes_note_id)
        REFERENCES friends.friend_notes(id) ON DELETE SET NULL,
      CONSTRAINT friend_notes_content_not_empty CHECK (length(trim(content)) > 0),
      CONSTRAINT friend_notes_source_not_self CHECK (source_friend_id <> friend_id),
      -- Only an older note can be superseded; this also rules out self-links and cycles.
      CONSTRAINT friend_notes_supersedes_older CHECK (supersedes_note_id < id)
    );

    COMMENT ON TABLE friends.friend_notes IS 'Timestamped free-text notes about a friend';

    CREATE INDEX idx_friend_notes_friend_id_created_at
      ON friends.friend_notes (friend_id, created_at DESC);
    CREATE INDEX idx_friend_notes_encounter_id ON friends.friend_notes (encounter_id);
    CREATE INDEX idx_friend_notes_source_friend_id ON friends.friend_notes (source_friend_id);
    -- A note has at most one newer version; doubles as the FK index.
    CREATE UNIQUE INDEX idx_friend_notes_supersedes_note_id
      ON friends.friend_notes (supersedes_note_id)
      WHERE supersedes_note_id IS NOT NULL;
    CREATE INDEX idx_friend_notes_search_vector ON friends.friend_notes USING gin (search_vector);
    CREATE INDEX idx_friend_notes_content_trgm ON friends.friend_notes USING gin (content gin_trgm_ops);

    CREATE TRIGGER update_friend_notes_updated_at
      BEFORE UPDATE ON friends.friend_notes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS friends.friend_notes CASCADE;');
}
