import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Log circle assignments to the CardDAV sync log.
 *
 * Every other friend sub-resource table (phones, emails, addresses, urls,
 * dates, social profiles, met info, professional history) carries a row-level
 * `friends.log_subresource_change()` trigger so that editing a sub-resource
 * shows up as an `update` on the parent friend. `friends.friend_circles` was
 * added later (1768600000000_circles-and-organization) and never got one, even
 * though circles are exported as the vCard `CATEGORIES` property — so joining
 * or leaving a circle changed the card's content without touching the sync log.
 *
 * Two consequences: an incremental sync never reported the change, and a client
 * still holding the pre-change card could PUT it back, which reverts the circle
 * assignment because the server treats the client copy as authoritative.
 *
 * `log_subresource_change()` reads `COALESCE(NEW.friend_id, OLD.friend_id)` and
 * looks the parent's `external_id`/`user_id` up from `friends.friends`, so the
 * junction table needs no `external_id` of its own: the logged change names the
 * friend, exactly like the other sub-resource triggers.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TRIGGER circle_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON friends.friend_circles
    FOR EACH ROW
    EXECUTE FUNCTION friends.log_subresource_change();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TRIGGER IF EXISTS circle_change_trigger ON friends.friend_circles;');
}
