import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Disable Matrix channels whose stored homeserver is not https.
 *
 * The send path now rejects a non-https homeserver outright (the SSRF guard
 * refuses anything but https), so a row that was configured with a plain http
 * URL before that check existed would fail silently on every daily run. It is
 * switched off here instead; the user re-enters an https URL and re-enables the
 * channel, which the update schema enforces.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    UPDATE system.notification_channels
      SET is_enabled = false, updated_at = current_timestamp
      WHERE platform = 'matrix'
        AND matrix_homeserver IS NOT NULL
        AND matrix_homeserver !~ '^https://';
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // Which channels were enabled before is not recorded anywhere, so the
  // previous state cannot be restored.
}
