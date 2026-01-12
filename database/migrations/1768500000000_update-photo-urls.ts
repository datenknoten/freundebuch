import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Update photo URLs from /api/uploads/contacts/ to /api/uploads/friends/
 *
 * This migration updates stored photo URLs in the friends table to use
 * the new /api/uploads/friends/ path after the contact→friend rename.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Update photo_url column
  pgm.sql(`
    UPDATE friends.friends
    SET photo_url = REPLACE(photo_url, '/api/uploads/contacts/', '/api/uploads/friends/')
    WHERE photo_url LIKE '%/api/uploads/contacts/%'
  `);

  // Update photo_thumbnail_url column
  pgm.sql(`
    UPDATE friends.friends
    SET photo_thumbnail_url = REPLACE(photo_thumbnail_url, '/api/uploads/contacts/', '/api/uploads/friends/')
    WHERE photo_thumbnail_url LIKE '%/api/uploads/contacts/%'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert photo_url column
  pgm.sql(`
    UPDATE friends.friends
    SET photo_url = REPLACE(photo_url, '/api/uploads/friends/', '/api/uploads/contacts/')
    WHERE photo_url LIKE '%/api/uploads/friends/%'
  `);

  // Revert photo_thumbnail_url column
  pgm.sql(`
    UPDATE friends.friends
    SET photo_thumbnail_url = REPLACE(photo_thumbnail_url, '/api/uploads/friends/', '/api/uploads/contacts/')
    WHERE photo_thumbnail_url LIKE '%/api/uploads/friends/%'
  `);
}
