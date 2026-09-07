import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Log archiving to the CardDAV sync log.
 *
 * `log_friend_change` decides whether an UPDATE is "meaningful" from an
 * explicit column list, and `archived_at` was never added to it — it arrived
 * with the archive feature after the trigger was written. Archiving therefore
 * wrote no log row at all, so an incremental sync had nothing to report and
 * every client that had already fetched the card kept showing it. The read
 * paths filter archived friends out, which made the gap invisible from the
 * server side: only a client that had synced before the archive could see it.
 *
 * Archiving is a deletion as far as a CardDAV client is concerned — the card
 * becomes unreadable, so the client has to drop it — and unarchiving puts it
 * back, which is a create rather than an update because the client no longer
 * holds the card to update.
 */
const UP = `
    DECLARE
      v_change_type TEXT;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is a meaningful change (excluding removed professional columns)
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.nickname IS DISTINCT FROM NEW.nickname
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.interests IS DISTINCT FROM NEW.interests
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
           OR OLD.archived_at IS DISTINCT FROM NEW.archived_at
        THEN
          -- Determine change type. Archiving hides the card from every read
          -- path, so a client holding it must be told to drop it.
          IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
             OR (NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL) THEN
            v_change_type := 'delete';
          ELSIF (OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL)
             OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
            -- The card reappears; the client does not have it to update.
            v_change_type := 'create';
          ELSE
            v_change_type := 'update';
          END IF;

          INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
          VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
`;

const DOWN = `
    DECLARE
      v_change_type TEXT;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
        VALUES (NEW.id, NEW.user_id, 'create', NEW.external_id);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Check if this is a meaningful change (excluding removed professional columns)
        IF OLD.display_name IS DISTINCT FROM NEW.display_name
           OR OLD.name_prefix IS DISTINCT FROM NEW.name_prefix
           OR OLD.name_first IS DISTINCT FROM NEW.name_first
           OR OLD.name_middle IS DISTINCT FROM NEW.name_middle
           OR OLD.name_last IS DISTINCT FROM NEW.name_last
           OR OLD.name_suffix IS DISTINCT FROM NEW.name_suffix
           OR OLD.nickname IS DISTINCT FROM NEW.nickname
           OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
           OR OLD.interests IS DISTINCT FROM NEW.interests
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
        THEN
          -- Determine change type
          IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_change_type := 'delete';
          ELSE
            v_change_type := 'update';
          END IF;

          INSERT INTO friends.friend_changes (friend_id, user_id, change_type, friend_external_id)
          VALUES (NEW.id, NEW.user_id, v_change_type, NEW.external_id);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
`;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createFunction(
    { schema: 'friends', name: 'log_friend_change' },
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    UP,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.createFunction(
    { schema: 'friends', name: 'log_friend_change' },
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    DOWN,
  );
}
